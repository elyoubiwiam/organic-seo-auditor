import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Loader2 } from "lucide-react";
import { disconnectGsc, fetchPerformance, gscStatus, listSites, startGscConnect } from "@/lib/gsc.functions";
import { useAuth } from "@/hooks/useAuth";
import type { Row } from "@/lib/seo/types";

export function GscConnect({ onRows }: { onRows: (site: string, rows: Row[]) => Promise<void> }) {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const status = useServerFn(gscStatus);
  const start = useServerFn(startGscConnect);
  const sitesFn = useServerFn(listSites);
  const perf = useServerFn(fetchPerformance);
  const disc = useServerFn(disconnectGsc);
  const [site, setSite] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const st = useQuery({ queryKey: ["gsc-status", user?.id], queryFn: () => status(), enabled: !!user });
  const sites = useQuery({ queryKey: ["gsc-sites", user?.id], queryFn: () => sitesFn(), enabled: !!st.data?.connected });

  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "gsc-connect") qc.invalidateQueries({ queryKey: ["gsc-status"] });
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [qc]);

  const box = "rounded-xl border bg-card p-6 shadow-card";
  const intro = (
    <>
      <div className="flex items-center gap-2 font-medium"><Link2 className="h-4 w-4 text-primary" /> Connect Search Console</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Link your Google account to audit your sites directly — no export needed. We read your last 6 months of search data (read-only) and only you can see it.
      </p>
    </>
  );

  if (loading) return null;
  if (!user)
    return (
      <div className={box}>
        {intro}
        <Link to="/auth" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Sign in to connect</Link>
      </div>
    );
  if (st.isLoading) return <div className={box}>{intro}<p className="mt-3 text-sm text-muted-foreground">Checking…</p></div>;
  if (st.data && !st.data.configured)
    return <div className={box}>{intro}<p className="mt-3 text-sm text-muted-foreground">Google connection is being set up by the app owner — available soon.</p></div>;

  const connect = async () => {
    setErr(null);
    const popup = window.open("", "gsc", "width=520,height=680");
    try {
      const { url } = await start({ data: { origin: window.location.origin } });
      if (popup) popup.location.href = url; else window.location.href = url;
    } catch (e) {
      popup?.close();
      setErr(e instanceof Error ? e.message : "Couldn't start the connection");
    }
  };

  const run = async () => {
    if (!site) return;
    setBusy(true); setErr(null);
    try {
      const { rows } = await perf({ data: { siteUrl: site } });
      await onRows(site, rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const disconnect = async () => {
    await disc();
    setSite("");
    qc.invalidateQueries({ queryKey: ["gsc-status"] });
    qc.removeQueries({ queryKey: ["gsc-sites"] });
  };

  return (
    <div className={box}>
      {intro}
      {!st.data?.connected ? (
        <button onClick={connect} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Connect with Google</button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Linked: {st.data.email ?? "Google account"}</span>
            <button onClick={disconnect} className="underline hover:text-foreground">Disconnect</button>
          </div>
          {sites.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your sites…</p>
          ) : sites.error ? (
            <p className="text-sm text-destructive">{(sites.error as Error).message}</p>
          ) : sites.data?.sites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verified sites found in this Google account.</p>
          ) : (
            <div className="flex gap-2">
              <select value={site} onChange={(e) => setSite(e.target.value)} className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm" aria-label="Site">
                <option value="">Choose a site…</option>
                {sites.data?.sites.map((s) => <option key={s} value={s}>{s.replace(/^sc-domain:/, "")}</option>)}
              </select>
              <button onClick={run} disabled={!site || busy} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Run audit
              </button>
            </div>
          )}
        </div>
      )}
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
    </div>
  );
}
