import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ArrowLeft, TrendingDown, Target, MousePointerClick, Zap, Compass, BarChart3 } from "lucide-react";
import { runAudit, type Finding, type Severity } from "@/lib/seo/analyze";
import { INDUSTRIES } from "@/lib/seo/benchmarks";
import type { Dataset, IndustryKey } from "@/lib/seo/types";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "quickwins", label: "Quick wins" },
  { id: "lowctr", label: "Low-CTR pages" },
  { id: "decay", label: "Decaying queries" },
  { id: "striking", label: "Striking distance" },
  { id: "strategy", label: "Strategic analysis" },
  { id: "benchmarks", label: "Benchmarks & gaps" },
];

export function Report({ dataset, onReset }: { dataset: Dataset; onReset: () => void }) {
  const [industry, setIndustry] = useState<IndustryKey>(dataset.industry);
  const audit = useMemo(() => runAudit({ ...dataset, industry }), [dataset, industry]);
  const totalOpp =
    audit.lowCtr.reduce((s, f) => s + f.opportunity, 0) +
    audit.striking.reduce((s, f) => s + f.opportunity, 0) +
    audit.decaying.reduce((s, f) => s + f.opportunity, 0);

  return (
    <div className="min-h-screen">
      <header className="border-b bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <button onClick={onReset} className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100">
            <ArrowLeft className="h-4 w-4" /> New audit
          </button>
          <div className="font-mono text-xs uppercase tracking-widest opacity-70">{dataset.name}</div>
          <label className="flex items-center gap-2 text-sm">
            <span className="opacity-70">Industry</span>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value as IndustryKey)}
              className="rounded border border-ink-foreground/30 bg-ink px-2 py-1 text-ink-foreground"
            >
              {INDUSTRIES.map((i) => (
                <option key={i.key} value={i.key}>{i.label}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block">
          <ol className="sticky top-8 space-y-1 border-l">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
                  <span className="mr-2 font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main className="min-w-0 space-y-20">
          {/* Summary */}
          <section id="summary" className="scroll-mt-8">
            <SectionTitle n="01" title="Organic health summary" />
            <div className="grid gap-6 md:grid-cols-[260px_1fr]">
              <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-8">
                <ScoreRing score={audit.score} />
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  {audit.score >= 75 ? "Strong organic foundation" : audit.score >= 50 ? "Solid, with clear upside" : "Significant untapped potential"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3">
                <Stat label="Clicks" value={fmt(audit.totals.clicks)} sub={audit.totals.clicksDelta != null ? `${audit.totals.clicksDelta >= 0 ? "+" : ""}${pct(audit.totals.clicksDelta)} vs prev.` : undefined} bad={(audit.totals.clicksDelta ?? 0) < 0} />
                <Stat label="Impressions" value={fmt(audit.totals.impressions)} />
                <Stat label="Avg. CTR" value={pct(audit.totals.ctr, 2)} />
                <Stat label="Avg. position" value={audit.totals.position.toFixed(1)} />
                <Stat label="Issues found" value={String(audit.lowCtr.length + audit.decaying.length + audit.striking.length)} />
                <Stat label="Est. clicks / month on the table" value={`+${fmt(totalOpp)}`} highlight />
              </div>
            </div>
          </section>

          {/* Quick wins */}
          <section id="quickwins" className="scroll-mt-8">
            <SectionTitle n="02" title="Quick-win recommendations" icon={<Zap className="h-5 w-5" />} lead="Ranked by estimated monthly click gain relative to effort. Start at the top." />
            <ol className="divide-y rounded-lg border bg-card">
              {audit.recommendations.map((r, i) => (
                <li key={i} className="grid gap-3 p-5 md:grid-cols-[40px_1fr_auto]">
                  <span className="font-display text-3xl text-primary">{i + 1}</span>
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide">{r.category}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">Effort: {r.effort}</span>
                    </div>
                    <h4 className="font-medium">{r.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>
                  </div>
                  <div className="text-right font-mono text-sm">
                    <div className="text-lg font-semibold text-success">+{fmt(r.impact)}</div>
                    <div className="text-xs text-muted-foreground">clicks/mo</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <FindingSection id="lowctr" n="03" icon={<MousePointerClick className="h-5 w-5" />} title="High impressions, low CTR" lead="Visible on page one, but searchers aren't clicking. Your snippet is losing to competitors." findings={audit.lowCtr} empty="No page-one results are significantly under their benchmark CTR." />
          <FindingSection id="decay" n="04" icon={<TrendingDown className="h-5 w-5" />} title="Decaying search queries" lead="Queries losing clicks compared with the previous period." findings={audit.decaying} empty={audit.hasComparison ? "No meaningful declines detected." : "Upload a 'Compare' export from Search Console (e.g. last 3 months vs previous) to detect decay."} />
          <FindingSection id="striking" n="05" icon={<Target className="h-5 w-5" />} title="Striking-distance keywords (rank 11-20)" lead="Already on page two — a modest push can land them on page one, where ~90% of clicks happen." findings={audit.striking} empty="No queries currently rank in positions 11-20." />

          {/* Strategy */}
          <section id="strategy" className="scroll-mt-8">
            <SectionTitle n="06" title="Strategic analysis" icon={<Compass className="h-5 w-5" />} lead="What the findings mean for the business, and how to turn them into a growth plan." />
            <div className="grid gap-6 md:grid-cols-3">
              <Explainer
                title="Low CTR = wasted visibility"
                meaning={`You already paid the hard part — Google shows you ${fmt(audit.lowCtr.reduce((s, f) => s + f.row.impressions, 0))} times on these pages. Poor titles mean competitors collect the visit, and the customer.`}
                why="It's the cheapest traffic you'll ever get: no new rankings needed, only better messaging."
              />
              <Explainer
                title="Decay = eroding revenue"
                meaning={audit.hasComparison ? `${audit.decaying.length} queries are sliding. Left alone, content decay compounds as competitors publish fresher pages.` : "Decay can't be measured without a comparison period, but most sites lose 10-30% of traffic per year on unrefreshed content."}
                why="Protecting existing traffic is typically 3-5× cheaper than acquiring equivalent new traffic."
              />
              <Explainer
                title="Page two = hidden pipeline"
                meaning={`${audit.striking.length} keywords sit just off page one. Moving to page one typically multiplies clicks 5-10×.`}
                why="Google already sees these pages as relevant — they need depth and internal authority, not a rewrite."
              />
            </div>

            <div className="mt-8 rounded-lg border bg-ink p-8 text-ink-foreground">
              <h3 className="font-display text-3xl">90-day organic growth plan</h3>
              <ol className="mt-6 grid gap-6 md:grid-cols-2">
                {[
                  ["Weeks 1-2 · Fix the snippets", `Rewrite titles and meta descriptions for the ${Math.min(10, audit.lowCtr.length) || "top"} low-CTR pages. Add structured data (FAQ, Review, HowTo) where relevant. Measure CTR after 3-4 weeks.`],
                  ["Weeks 2-5 · Stop the leaks", "Refresh decaying pages: update stats and dates, expand thin sections, check search intent against the current top 3, and re-request indexing."],
                  ["Weeks 4-8 · Push page two", "For each striking-distance keyword: tighten on-page targeting, add depth, and build 3-5 internal links from high-traffic pages with descriptive anchors."],
                  ["Weeks 6-12 · Close content gaps", "Publish the gap themes below (comparisons, templates, question guides). Build topic clusters that interlink to your money pages."],
                  ["Ongoing · Measure & iterate", "Re-run this audit monthly. Track clicks, CTR vs benchmark, and the number of keywords in the top 10 as your core KPIs."],
                  ["Governance", "Assign an owner per page cluster and add a 'last reviewed' date — content older than 12 months goes into the refresh queue."],
                ].map(([t, d], i) => (
                  <li key={i} className="flex gap-4">
                    <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="font-medium">{t}</div>
                      <p className="mt-1 text-sm opacity-75">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Benchmarks */}
          <section id="benchmarks" className="scroll-mt-8">
            <SectionTitle n="07" title="Competitor & industry benchmarks" icon={<BarChart3 className="h-5 w-5" />} lead={`Your CTR at each ranking position against the ${INDUSTRIES.find((i) => i.key === industry)?.label} benchmark curve. Points below the line mean competitors win more of the clicks at that position.`} />
            <div className="rounded-lg border bg-card p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={audit.ctrVsBenchmark} margin={{ left: 0, right: 16, top: 8 }}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="position" tick={{ fontSize: 12 }} label={{ value: "Position", position: "insideBottom", offset: -2, fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => pct(v)} labelFormatter={(l) => `Position ${l}`} />
                    <Legend />
                    <Line type="monotone" dataKey="benchmark" name="Industry benchmark" stroke="var(--color-chart-2)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                    <Line type="monotone" dataKey="site" name="Your site" stroke="var(--color-chart-1)" strokeWidth={2.5} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <h3 className="mt-10 mb-4 font-display text-2xl">Content & keyword gap opportunities</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {audit.gaps.map((g) => (
                <div key={g.theme} className="rounded-lg border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-medium">{g.theme}</h4>
                    <span className="whitespace-nowrap font-mono text-sm text-success">~+{fmt(g.potential)}/mo</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{g.evidence}</p>
                  <p className="mt-3 border-t pt-3 text-sm">{g.idea}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Benchmarks and gaps are based on blended industry CTR studies and query-pattern heuristics. Live competitor data can be added later.</p>
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionTitle({ n, title, lead, icon }: { n: string; title: string; lead?: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-primary">
        {n} {icon}
      </div>
      <h2 className="mt-1 font-display text-4xl leading-tight">{title}</h2>
      {lead && <p className="mt-2 max-w-2xl text-muted-foreground">{lead}</p>}
    </div>
  );
}

function Stat({ label, value, sub, bad, highlight }: { label: string; value: string; sub?: string | undefined; bad?: boolean; highlight?: boolean }) {
  return (
    <div className={cn("bg-card p-5", highlight && "bg-accent")}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
      {sub && <div className={cn("mt-1 font-mono text-xs", bad ? "text-destructive" : "text-success")}>{sub}</div>}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const c = 2 * Math.PI * 52;
  const color = score >= 75 ? "var(--color-success)" : score >= 50 ? "var(--color-warning)" : "var(--color-destructive)";
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-muted)" strokeWidth="10" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="10" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl">{score}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">score</span>
      </div>
    </div>
  );
}

const SEV: Record<Severity, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-foreground",
  low: "bg-secondary text-secondary-foreground",
};

function FindingSection({ id, n, title, lead, icon, findings, empty }: { id: string; n: string; title: string; lead: string; icon: React.ReactNode; findings: Finding[]; empty: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id={id} className="scroll-mt-8">
      <SectionTitle n={n} title={title} lead={lead} icon={icon} />
      {findings.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{empty}</div>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {findings.map((f, i) => (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)} className="grid w-full items-center gap-3 p-4 text-left hover:bg-muted/50 md:grid-cols-[70px_1fr_auto]">
                <span className={cn("w-fit rounded px-2 py-0.5 font-mono text-[10px] uppercase", SEV[f.severity])}>{f.severity}</span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{f.label}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">{f.metric}</div>
                </div>
                <span className="font-mono text-sm text-success">+{fmt(f.opportunity)} clicks/mo</span>
              </button>
              {open === i && (
                <div className="bg-muted/40 px-4 pb-4 text-sm md:pl-[94px]">
                  {f.row.page && <div className="mb-2 truncate font-mono text-xs text-muted-foreground">{f.row.page}</div>}
                  <span className="font-medium">How to fix: </span>
                  {f.fix}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Explainer({ title, meaning, why }: { title: string; meaning: string; why: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h4 className="font-display text-2xl">{title}</h4>
      <p className="mt-3 text-sm">{meaning}</p>
      <p className="mt-3 border-t pt-3 text-sm text-muted-foreground"><span className="font-medium text-foreground">Why it matters: </span>{why}</p>
    </div>
  );
}
