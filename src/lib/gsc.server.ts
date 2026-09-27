import { decrypt } from "./crypto.server";
import type { Row } from "./seo/types";

export const CALLBACK_PATH = "/api/public/gsc/callback";
const API = "https://www.googleapis.com/webmasters/v3";

export function oauthCreds() {
  const id = process.env["GOOGLE_OAUTH_CLIENT_ID"];
  const secret = process.env["GOOGLE_OAUTH_CLIENT_SECRET"];
  if (!id || !secret) throw new Error("Google sign-in for Search Console isn't set up yet.");
  return { id, secret };
}

export function isAllowedOrigin(origin: string) {
  try {
    const u = new URL(origin);
    if (u.origin !== origin) return false;
    return u.protocol === "https:" || u.hostname === "localhost";
  } catch {
    return false;
  }
}

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getRefreshToken(userId: string) {
  const db = await adminDb();
  const { data, error } = await db.from("gsc_connections").select("refresh_token_encrypted, google_email").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { token: await decrypt(data.refresh_token_encrypted), email: data.google_email };
}

export async function accessToken(userId: string) {
  const rt = await getRefreshToken(userId);
  if (!rt) throw new Error("Search Console isn't connected.");
  const { id, secret } = oauthCreds();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: rt.token, grant_type: "refresh_token" }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Token refresh failed [${res.status}]: ${body}`);
    throw new Error("Google access expired. Please disconnect and connect Search Console again.");
  }
  return ((await res.json()) as { access_token: string }).access_token;
}

export async function verifiedSites(token: string) {
  const res = await fetch(`${API}/sites`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Couldn't list your sites [${res.status}]: ${await res.text()}`);
  const { siteEntry = [] } = (await res.json()) as { siteEntry?: { siteUrl: string; permissionLevel?: string }[] };
  return siteEntry.filter((s) => s.permissionLevel !== "siteUnverifiedUser").map((s) => s.siteUrl);
}

type ApiRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

async function query(token: string, site: string, start: string, end: string) {
  const res = await fetch(`${API}/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: start, endDate: end, dimensions: ["query", "page"], rowLimit: 5000 }),
  });
  if (res.status === 403) throw new Error("Your Google account doesn't have access to this site in Search Console.");
  if (!res.ok) throw new Error(`Search Console request failed [${res.status}]: ${await res.text()}`);
  return ((await res.json()) as { rows?: ApiRow[] }).rows ?? [];
}

const day = (d: Date) => d.toISOString().slice(0, 10);
const minus = (d: Date, n: number) => new Date(d.getTime() - n * 86400000);

export async function performanceRows(token: string, site: string): Promise<Row[]> {
  const end = minus(new Date(), 3);
  const start = minus(end, 89);
  const pEnd = minus(start, 1);
  const pStart = minus(pEnd, 89);
  const [cur, prev] = await Promise.all([query(token, site, day(start), day(end)), query(token, site, day(pStart), day(pEnd))]);
  const prevMap = new Map(prev.map((r) => [r.keys.join("|"), r]));
  return cur
    .filter((r) => r.impressions > 0)
    .map((r) => {
      const p = prevMap.get(r.keys.join("|"));
      return {
        query: r.keys[0] ?? "",
        page: r.keys[1] ?? "",
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
        prevClicks: p ? p.clicks : prev.length ? 0 : undefined,
        prevImpressions: p?.impressions,
        prevPosition: p?.position,
      };
    });
}
