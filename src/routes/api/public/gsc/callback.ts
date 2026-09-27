import { createFileRoute } from "@tanstack/react-router";
import { encrypt, verifyState } from "@/lib/crypto.server";
import { CALLBACK_PATH, oauthCreds } from "@/lib/gsc.server";

function page(ok: boolean, msg: string, origin: string) {
  const html = `<!doctype html><meta charset="utf-8"><title>Search Console</title>
<body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center;max-width:360px"><h2>${ok ? "Connected" : "Connection failed"}</h2><p>${msg}</p><p><a href="/">Back to the app</a></p></div>
<script>try{if(window.opener){window.opener.postMessage({type:"gsc-connect",ok:${ok}},${JSON.stringify(origin)});setTimeout(()=>window.close(),800)}else if(${ok}){location.replace("/")}}catch(e){}</script></body>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export const Route = createFileRoute("/api/public/gsc/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        const stateRaw = url.searchParams.get("state");
        if (url.searchParams.get("error")) return page(false, "Google access was not granted.", origin);
        if (!code || !stateRaw) return page(false, "Missing information from Google.", origin);

        const state = await verifyState<{ u: string; o: string; exp: number }>(stateRaw);
        if (!state || state.exp < Date.now()) return page(false, "This link expired. Please try again.", origin);

        const { id, secret } = oauthCreds();
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: state.o + CALLBACK_PATH, grant_type: "authorization_code" }),
        });
        if (!res.ok) {
          console.error(`Google token exchange failed [${res.status}]: ${await res.text()}`);
          return page(false, "Google refused the connection. Please try again.", origin);
        }
        const tok = (await res.json()) as { refresh_token?: string; id_token?: string; scope?: string };
        if (!tok.refresh_token) return page(false, "Google didn't return long-term access. Remove the app in your Google account permissions and try again.", origin);
        if (!tok.scope?.includes("webmasters")) return page(false, "Please allow Search Console access when Google asks.", origin);

        let email: string | null = null;
        try {
          const payload = tok.id_token?.split(".")[1];
          if (payload) email = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).email ?? null;
        } catch { /* ignore */ }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("gsc_connections").upsert({
          user_id: state.u,
          refresh_token_encrypted: await encrypt(tok.refresh_token),
          google_email: email,
          created_at: new Date().toISOString(),
        });
        if (error) {
          console.error(error);
          return page(false, "Couldn't save the connection.", origin);
        }
        return page(true, "Search Console is linked. You can close this window.", origin);
      },
    },
  },
});
