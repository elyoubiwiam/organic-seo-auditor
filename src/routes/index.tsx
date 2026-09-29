import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, Play } from "lucide-react";
import { Report } from "@/components/audit/Report";
import { SiteHeader } from "@/components/SiteHeader";
import { buildSampleDataset } from "@/lib/seo/sample";
import { parseGscCsv } from "@/lib/seo/csv";
import { INDUSTRIES } from "@/lib/seo/benchmarks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Dataset, IndustryKey, Row } from "@/lib/seo/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Organic Auditor — Search Console audit with AI analysis" },
      { name: "description", content: "Upload your Search Console CSV and get an AI analysis of low-CTR pages, decaying queries and striking-distance keywords, with a 90-day plan." },
      { property: "og:title", content: "Organic Auditor — Search Console audit with AI analysis" },
      { property: "og:description", content: "Private Search Console audits with AI insights and a clear plan to grow organic traffic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [industry, setIndustry] = useState<IndustryKey>("saas");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const save = async (site: string, ind: IndustryKey, source: string, rows: Row[]) => {
    const { data, error } = await supabase.from("audits").insert({ site, industry: ind, source, rows: rows as never, user_id: user!.id }).select("id").single();
    if (error) throw new Error(error.message);
    navigate({ to: "/audits/$id", params: { id: data.id } });
  };

  // Signed-in users get their audit saved privately (and AI analysis); guests see it locally.
  const open = async (ds: Dataset, source: string) => {
    if (user) {
      try { await save(ds.site, ds.industry, source, ds.rows); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save audit"); }
    } else setDataset(ds);
  };

  if (dataset) return <Report dataset={dataset} onReset={() => setDataset(null)} />;

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      const rows = parseGscCsv(await file.text());
      await open({ name: file.name, site: file.name, industry, rows }, "csv");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Find the clicks your site is <span className="text-primary">already</span> leaving on the table.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Upload your Search Console CSV export and get an AI analysis that explains what's really happening, why, and exactly what to do next. Your data stays private to you.
          </p>
          <ul className="mt-10 grid max-w-xl grid-cols-2 gap-3 text-sm">
            {[
              ["bg-critical", "Pages people see but don't click"],
              ["bg-high", "Searches losing traffic"],
              ["bg-medium", "Keywords almost on page one"],
              ["bg-low", "AI insights and a 90-day plan"],
            ].map(([c, t]) => (
              <li key={t} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 shadow-card">
                <span className={`h-2 w-2 shrink-0 rounded-full ${c}`} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Industry</span>
            <select value={industry} onChange={(e) => setIndustry(e.target.value as IndustryKey)} className="rounded-lg border bg-background px-3 py-1.5">
              {INDUSTRIES.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
          </label>

          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="font-medium">Upload your Search Console CSV</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Drop in your export and we'll analyse it instantly. In Search Console: Performance → Export → CSV (Queries or Pages). Tip: use “Compare” dates to spot searches losing traffic.
            </p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
              className="mt-4 flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
            >
              <Upload className="h-5 w-5" /> Drop CSV here or click to browse
            </button>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>

          <button onClick={() => open(buildSampleDataset(), "demo")} className="group flex w-full items-center justify-between rounded-xl bg-primary p-5 text-left text-primary-foreground shadow-card transition hover:opacity-95">
            <div>
              <div className="font-semibold">Try the demo audit</div>
              <div className="mt-0.5 text-sm opacity-80">Fictional SaaS site · no account needed</div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground text-primary transition group-hover:scale-110">
              <Play className="h-4 w-4" />
            </span>
          </button>
          <a href="/privacy" className="block text-center text-xs text-muted-foreground hover:text-foreground">Privacy policy</a>
        </div>
      </main>
    </div>
  );
}
