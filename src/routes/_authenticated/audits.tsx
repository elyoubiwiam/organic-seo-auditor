import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/_authenticated/audits")({
  head: () => ({
    meta: [
      { title: "My audits — Organic Auditor" },
      { name: "description", content: "Your saved, private Search Console audits." },
      { property: "og:title", content: "My audits — Organic Auditor" },
      { property: "og:description", content: "Your saved, private Search Console audits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditsPage,
});

function AuditsPage() {
  const child = useMatch({ from: "/_authenticated/audits/$id", shouldThrow: false });
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["audits"],
    enabled: !child,
    queryFn: async () => {
      const { data, error } = await supabase.from("audits").select("id, site, industry, source, created_at, ai_analysis").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (child) return <Outlet />;

  const remove = async (id: string) => {
    if (!confirm("Delete this audit?")) return;
    await supabase.from("audits").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["audits"] });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">My audits</h1>
        <p className="mt-1 text-sm text-muted-foreground">Only you can see these.</p>
        <div className="mt-6 space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {data?.length === 0 && <p className="text-sm text-muted-foreground">No audits yet. <Link to="/" className="text-primary">Run one</Link>.</p>}
          {data?.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-card">
              <Link to="/audits/$id" params={{ id: a.id }} className="min-w-0 flex-1">
                <div className="truncate font-medium">{a.site}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()} · {a.source === "gsc" ? "Search Console" : a.source === "csv" ? "CSV" : "Demo"}{a.ai_analysis ? " · AI analysis" : ""}
                </div>
              </Link>
              <button onClick={() => remove(a.id)} aria-label="Delete audit" className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
