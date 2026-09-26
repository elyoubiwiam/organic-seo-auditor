import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, Play, Link2 } from "lucide-react";
import { Report } from "@/components/audit/Report";
import { buildSampleDataset } from "@/lib/seo/sample";
import { parseGscCsv } from "@/lib/seo/csv";
import { INDUSTRIES } from "@/lib/seo/benchmarks";
import type { Dataset, IndustryKey } from "@/lib/seo/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Organic Auditor — Search Console performance audit" },
      { name: "description", content: "Find low-CTR pages, decaying queries and striking-distance keywords, with a strategic growth plan and industry CTR benchmarks." },
      { property: "og:title", content: "Organic Auditor — Search Console performance audit" },
      { property: "og:description", content: "Instant organic performance audit from Search Console data, with a one-click demo." },
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

  if (dataset) return <Report dataset={dataset} onReset={() => setDataset(null)} />;

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      const rows = parseGscCsv(await file.text());
      setDataset({ name: file.name, site: file.name, industry, rows });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="font-mono text-xs uppercase tracking-widest text-primary">Organic Auditor</div>
      </div>
      <main className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h1 className="font-display text-6xl leading-[1.02] md:text-7xl">
            Find the clicks your site is <em className="text-primary">already</em> leaving on the table.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            A Search Console audit that surfaces low-CTR pages, decaying queries and page-two keywords — then explains what it means and what to do next.
          </p>
          <ul className="mt-10 grid max-w-xl grid-cols-2 gap-4 text-sm">
            {["High-impression, low-CTR pages", "Decaying search queries", "Striking-distance keywords (11-20)", "CTR vs industry benchmarks"].map((t) => (
              <li key={t} className="border-t pt-3">{t}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <button onClick={() => setDataset(buildSampleDataset())} className="group flex w-full items-center justify-between rounded-lg bg-ink p-6 text-left text-ink-foreground transition hover:opacity-95">
            <div>
              <div className="font-display text-3xl">Run demo audit</div>
              <div className="mt-1 text-sm opacity-70">Sample SaaS site · 25 queries · 2 periods</div>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground transition group-hover:scale-110">
              <Play className="h-5 w-5" />
            </span>
          </button>

          <div className="rounded-lg border bg-card p-6">
            <div className="font-medium">Upload a Search Console export</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Performance → Export → CSV (Queries or Pages). Use “Compare” dates to detect decay.
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Industry</span>
              <select value={industry} onChange={(e) => setIndustry(e.target.value as IndustryKey)} className="rounded border bg-background px-2 py-1">
                {INDUSTRIES.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
              </select>
            </label>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
              className="mt-4 flex w-full flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
            >
              <Upload className="h-5 w-5" /> Drop CSV here or click to browse
            </button>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            <Link2 className="h-4 w-4 shrink-0" />
            <span>Direct Search Console connection — coming soon.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
