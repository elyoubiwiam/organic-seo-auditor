import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signState } from "./crypto.server";
import { CALLBACK_PATH, accessToken, getRefreshToken, isAllowedOrigin, oauthCreds, performanceRows, verifiedSites } from "./gsc.server";

export const gscStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const configured = !!process.env["GOOGLE_OAUTH_CLIENT_ID"] && !!process.env["GOOGLE_OAUTH_CLIENT_SECRET"];
    const rt = configured ? await getRefreshToken(context.userId) : null;
    return { configured, connected: !!rt, email: rt?.email ?? null };
  });

export const startGscConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ origin: z.string().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!isAllowedOrigin(data.origin)) throw new Error("Invalid origin");
    const { id } = oauthCreds();
    const state = await signState({ u: context.userId, o: data.origin, n: crypto.randomUUID(), exp: Date.now() + 10 * 60_000 });
    const params = new URLSearchParams({
      client_id: id,
      redirect_uri: data.origin + CALLBACK_PATH,
      response_type: "code",
      scope: "openid email https://www.googleapis.com/auth/webmasters.readonly",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
  });

export const listSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = await accessToken(context.userId);
    return { sites: await verifiedSites(token) };
  });

export const fetchPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ siteUrl: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const token = await accessToken(context.userId);
    const sites = await verifiedSites(token);
    const site = sites.find((s) => s === data.siteUrl);
    if (!site) throw new Error("That site isn't in your verified Search Console properties.");
    const rows = await performanceRows(token, site);
    if (!rows.length) throw new Error("Search Console has no search data for this site in the last 3 months yet.");
    return { rows };
  });

export const disconnectGsc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rt = await getRefreshToken(context.userId).catch(() => null);
    if (rt) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(rt.token)}`, { method: "POST" }).catch(() => {});
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("gsc_connections").delete().eq("user_id", context.userId);
    return { ok: true };
  });
