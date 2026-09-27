import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Organic Auditor" },
      { name: "description", content: "Sign in to connect your Search Console and keep your audits private." },
      { property: "og:title", content: "Sign in — Organic Auditor" },
      { property: "og:description", content: "Private Search Console audits with AI analysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { if (s) navigate({ to: "/" }); });
    supabase.auth.getSession().then(({ data: d }) => { if (d.session) navigate({ to: "/" }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { data, error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === "up" && !data.session) setMsg("Check your email to confirm your account.");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg(r.error.message ?? "Google sign-in failed");
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{mode === "in" ? "Sign in" : "Create account"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your audits and Search Console data are visible only to you.</p>
        <button onClick={google} className="mt-6 w-full rounded-lg border bg-card px-4 py-2.5 text-sm font-medium shadow-card hover:bg-secondary">Continue with Google</button>
        <div className="my-5 text-center text-xs text-muted-foreground">or</div>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
        {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 text-sm text-primary">
          {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
      </main>
    </div>
  );
}
