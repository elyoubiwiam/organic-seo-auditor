import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Lightbulb } from "lucide-react";
import { runAudit, type Audit, type Finding, type Recommendation } from "@/lib/seo/analyze";
import { INDUSTRIES } from "@/lib/seo/benchmarks";
import type { Dataset, IndustryKey } from "@/lib/seo/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

type Tier = "critical" | "high" | "medium" | "low";
const tierOf = (gain: number): Tier => (gain >= 500 ? "critical" : gain >= 200 ? "high" : gain >= 60 ? "medium" : "low");
const TIER: Record<Tier, { label: string; dot: string; soft: string; text: string; bar: string }> = {
  critical: { label: "Critical", dot: "bg-critical", soft: "bg-critical-soft", text: "text-critical", bar: "bg-critical" },
  high: { label: "High", dot: "bg-high", soft: "bg-high-soft", text: "text-high", bar: "bg-high" },
  medium: { label: "Medium", dot: "bg-medium", soft: "bg-medium-soft", text: "text-medium", bar: "bg-medium" },
  low: { label: "Low", dot: "bg-low", soft: "bg-low-soft", text: "text-low", bar: "bg-low" },
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "priorities", label: "Top priorities" },
  { id: "issues", label: "Issues" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "strategy", label: "Strategy" },
];

export function Report({ dataset, onReset }: { dataset: Dataset; onReset: () => void }) {
  const [industry, setIndustry] = useState<IndustryKey>(dataset.industry);
  const audit = useMemo(() => runAudit({ ...dataset, industry }), [dataset, industry]);
  const industryLabel = INDUSTRIES.find((i) => i.key === industry)?.label ?? "";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <button onClick={onReset} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> New audit
          </button>
          <div className="truncate text-sm font-medium">{dataset.name}</div>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value as IndustryKey)}
            className="rounded-lg border bg-card px-3 py-1.5 text-sm"
            aria-label="Industry"
          >
            {INDUSTRIES.map((i) => (
              <option key={i.key} value={i.key}>{i.label}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[160px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-24 space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">{s.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0 space-y-16">
          <Overview audit={audit} />
          <TopPriorities recs={audit.recommendations} />
          <Issues audit={audit} />
          <Benchmarks audit={audit} industryLabel={industryLabel} />
          <Strategy audit={audit} />
        </main>
      </div>
    </div>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {lead && <p className="mt-1 max-w-2xl text-muted-foreground">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("rounded-xl border bg-card shadow-card", className)}>{children}</div>
);

function TierBadge({ tier }: { tier: Tier }) {
  const t = TIER[tier];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", t.soft, t.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />
      {t.label}
    </span>
  );
}

/* ---------- Overview ---------- */
function Overview({ audit }: { audit: Audit }) {
  const all = [...audit.lowCtr, ...audit.decaying, ...audit.striking];
  const totalGain = all.reduce((s, f) => s + f.opportunity, 0);
  const counts = (["critical", "high", "medium", "low"] as Tier[]).map((t) => ({ t, n: all.filter((f) => tierOf(f.opportunity) === t).length }));
  const verdict = audit.score >= 75 ? "Strong foundation" : audit.score >= 50 ? "Solid, with clear upside" : "Lots of untapped potential";
  const scoreTier: Tier = audit.score >= 75 ? "low" : audit.score >= 50 ? "high" : "critical";

  return (
    <section id="overview" className="scroll-mt-20">
      <Card className="p-6 md:p-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <ScoreRing score={audit.score} tier={scoreTier} />
          <div className="flex-1">
            <div className={cn("text-sm font-medium", TIER[scoreTier].text)}>{verdict}</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
              You're missing about <span className="text-primary">{fmt(totalGain)} clicks</span> a month.
            </h1>
            <p className="mt-2 text-muted-foreground">We found {all.length} issues. Start with the critical ones — they hold most of the upside.</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            {counts.map(({ t, n }) => n > 0 && <div key={t} className={TIER[t].bar} style={{ width: `${(n / all.length) * 100}%` }} />)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {counts.map(({ t, n }) => (
              <span key={t} className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", TIER[t].dot)} />
                <span className="num font-medium text-foreground">{n}</span> {TIER[t].label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 border-t pt-6 md:grid-cols-4">
          <Metric label="Clicks" value={fmt(audit.totals.clicks)} delta={audit.totals.clicksDelta} />
          <Metric label="Impressions" value={fmt(audit.totals.impressions)} />
          <Metric label="Click-through rate" value={pct(audit.totals.ctr, 2)} />
          <Metric label="Average position" value={audit.totals.position.toFixed(1)} />
        </div>
      </Card>
    </section>
  );
}

function Metric({ label, value, delta }: { label: string; value: string; delta?: number | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="num mt-1 text-xl font-semibold">{value}</div>
      {delta != null && (
        <div className={cn("num text-xs", delta < 0 ? "text-critical" : "text-low")}>
          {delta >= 0 ? "▲" : "▼"} {pct(Math.abs(delta))} vs previous
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score, tier }: { score: number; tier: Tier }) {
  const c = 2 * Math.PI * 44;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" className="stroke-muted" strokeWidth="8" />
        <circle cx="50" cy="50" r="44" fill="none" className={cn("transition-all", `stroke-${tier}`)} style={{ stroke: `var(--${tier})` }} strokeWidth="8" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-3xl font-semibold">{score}</span>
        <span className="text-[11px] text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
}

/* ---------- Top priorities ---------- */
function TopPriorities({ recs }: { recs: Recommendation[] }) {
  const [showAll, setShowAll] = useState(false);
  const top = recs.slice(0, 3);
  const rest = recs.slice(3);
  return (
    <Section id="priorities" title="Top 3 priorities" lead="The actions with the best return for the effort. Do these first.">
      <div className="grid gap-4 md:grid-cols-3">
        {top.map((r, i) => {
          const tier = tierOf(r.impact);
          return (
            <Card key={i} className="relative overflow-hidden p-5">
              <div className={cn("absolute inset-x-0 top-0 h-1", TIER[tier].bar)} />
              <div className="flex items-center justify-between">
                <TierBadge tier={tier} />
                <span className="text-xs text-muted-foreground">{r.effort} effort</span>
              </div>
              <h3 className="mt-4 font-semibold leading-snug">{r.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{r.detail}</p>
              <div className="mt-4 border-t pt-3 text-sm">
                <span className="num font-semibold text-low">+{fmt(r.impact)}</span>
                <span className="text-muted-foreground"> clicks / month</span>
              </div>
            </Card>
          );
        })}
      </div>
      {rest.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowAll(!showAll)} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {showAll ? "Hide" : `See all ${recs.length} recommendations`}
            <ChevronDown className={cn("h-4 w-4 transition", showAll && "rotate-180")} />
          </button>
          {showAll && (
            <Card className="mt-3 divide-y">
              {rest.map((r, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", TIER[tierOf(r.impact)].dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.category} · {r.effort} effort</div>
                  </div>
                  <span className="num text-sm text-low">+{fmt(r.impact)}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </Section>
  );
}

/* ---------- Issues ---------- */
function Issues({ audit }: { audit: Audit }) {
  const tabs = [
    { v: "ctr", label: "Low click rate", tech: "High impressions, low CTR", explain: "You show up on page one, but people aren't clicking. Better titles fix this.", items: audit.lowCtr, empty: "No page-one results are far below the expected click rate." },
    { v: "decay", label: "Losing traffic", tech: "Decaying queries", explain: "Searches that brought fewer clicks than the previous period.", items: audit.decaying, empty: audit.hasComparison ? "No meaningful declines detected." : "Upload a Search Console export using “Compare” dates to spot declines." },
    { v: "near", label: "Almost page one", tech: "Striking distance · rank 11-20", explain: "On page two, a small push can land them where most clicks happen.", items: audit.striking, empty: "No searches currently rank in positions 11-20." },
  ];
  return (
    <Section id="issues" title="Issues" lead="Sorted by impact. Click any row to see how to fix it.">
      <Tabs defaultValue="ctr">
        <TabsList className="h-auto flex-wrap gap-1 rounded-xl bg-secondary p-1">
          {tabs.map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="rounded-lg px-4 py-2">
              {t.label}
              <span className="num ml-2 rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{t.items.length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.v} value={t.v} className="mt-4">
            <p className="mb-3 text-sm text-muted-foreground">
              {t.explain} <span className="text-xs opacity-70">({t.tech})</span>
            </p>
            <FindingList items={t.items} empty={t.empty} />
          </TabsContent>
        ))}
      </Tabs>
    </Section>
  );
}

function FindingList({ items, empty }: { items: Finding[]; empty: string }) {
  const [limit, setLimit] = useState(5);
  const [open, setOpen] = useState<number | null>(null);
  if (!items.length) return <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{empty}</div>;
  return (
    <>
      <Card className="divide-y">
        {items.slice(0, limit).map((f, i) => {
          const tier = tierOf(f.opportunity);
          return (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-4 p-4 text-left hover:bg-secondary/60">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", TIER[tier].dot)} title={TIER[tier].label} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{f.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{f.metric}</div>
                </div>
                <span className="num whitespace-nowrap text-sm text-low">+{fmt(f.opportunity)}/mo</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open === i && "rotate-180")} />
              </button>
              {open === i && (
                <div className={cn("mx-4 mb-4 rounded-lg p-4 text-sm", TIER[tier].soft)}>
                  <div className="mb-2 flex items-center gap-2">
                    <TierBadge tier={tier} />
                    {f.row.page && <span className="truncate text-xs text-muted-foreground">{f.row.page}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Lightbulb className={cn("mt-0.5 h-4 w-4 shrink-0", TIER[tier].text)} />
                    <span>{f.fix}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>
      {items.length > limit && (
        <button onClick={() => setLimit(items.length)} className="mt-3 text-sm font-medium text-primary hover:underline">
          Show {items.length - limit} more
        </button>
      )}
    </>
  );
}

/* ---------- Benchmarks ---------- */
function Benchmarks({ audit, industryLabel }: { audit: Audit; industryLabel: string }) {
  const rows = audit.ctrVsBenchmark.slice(0, 10).filter((r) => r.site != null);
  const page2 = audit.ctrVsBenchmark.slice(10);
  const p2Site = page2.filter((r) => r.site != null);
  const p2 = p2Site.length
    ? { site: p2Site.reduce((s, r) => s + (r.site ?? 0), 0) / p2Site.length, benchmark: page2.reduce((s, r) => s + r.benchmark, 0) / page2.length }
    : null;
  const max = Math.max(...rows.map((r) => Math.max(r.site ?? 0, r.benchmark)), 0.01);
  const mid = rows.filter((r) => r.position >= 4);
  const midRatio = mid.length ? mid.reduce((s, r) => s + (r.site ?? 0) / r.benchmark, 0) / mid.length : 1;
  const example = rows.find((r) => r.position === 5) ?? rows[0];

  const headline =
    midRatio < 0.85
      ? `At positions 4-10 you get about ${Math.round(midRatio * 100)}% of the clicks a typical ${industryLabel} site gets.`
      : midRatio > 1.1
        ? `At positions 4-10 you beat a typical ${industryLabel} site — your titles are working.`
        : `At positions 4-10 you're roughly in line with a typical ${industryLabel} site.`;

  const statusOf = (ratio: number) => (ratio >= 0.95 ? "low" : ratio >= 0.7 ? "high" : "critical") as Tier;

  return (
    <Section id="benchmarks" title="How you compare" lead="Out of 100 people who see your result at each position, how many click — versus a typical site in your industry.">
      <Card className="p-6">
        <p className="text-lg font-semibold tracking-tight">{headline}</p>
        {example && (
          <p className="mt-1 text-sm text-muted-foreground">
            How to read this: at position {example.position}, a typical site gets {pct(example.benchmark)} of searchers to click. You get {pct(example.site ?? 0)}.
          </p>
        )}
        <div className="mt-5 flex gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-primary" /> You</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-chart-2" /> Typical site</span>
        </div>
        <div className="mt-4 space-y-3">
          {rows.map((r) => {
            const ratio = (r.site ?? 0) / r.benchmark;
            const st = statusOf(ratio);
            return <BenchRow key={r.position} label={`#${r.position}`} site={r.site ?? 0} bench={r.benchmark} max={max} ratio={ratio} tier={st} />;
          })}
          {p2 && <BenchRow label="Page 2" site={p2.site} bench={p2.benchmark} max={max} ratio={p2.site / p2.benchmark} tier={statusOf(p2.site / p2.benchmark)} />}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">Positions with no data are hidden. Typical values are estimates based on published industry click-rate studies.</p>
      </Card>

      <h3 className="mt-10 text-lg font-semibold">Content gaps to fill</h3>
      <p className="mt-1 text-sm text-muted-foreground">Topics competitors likely win that your site doesn't cover well yet.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[...audit.gaps].sort((a, b) => b.potential - a.potential).map((g) => {
          const tier = tierOf(g.potential);
          return (
            <Card key={g.theme} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <TierBadge tier={tier} />
                <span className="num text-sm text-low">~+{fmt(g.potential)}/mo</span>
              </div>
              <h4 className="mt-3 font-semibold">{g.theme}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{g.evidence}</p>
              <p className="mt-3 text-sm">{g.idea}</p>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

function BenchRow({ label, site, bench, max, ratio, tier }: { label: string; site: number; bench: number; max: number; ratio: number; tier: Tier }) {
  const diff = Math.round((ratio - 1) * 100);
  return (
    <div className="grid grid-cols-[56px_1fr_72px] items-center gap-3">
      <span className="num text-sm text-muted-foreground">{label}</span>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-2.5 rounded-full bg-primary" style={{ width: `${(site / max) * 100}%`, minWidth: 4 }} />
          <span className="num text-xs">{pct(site)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 rounded-full bg-chart-2" style={{ width: `${(bench / max) * 100}%`, minWidth: 4 }} />
          <span className="num text-xs text-muted-foreground">{pct(bench)}</span>
        </div>
      </div>
      <span className={cn("num justify-self-end rounded-full px-2 py-0.5 text-xs font-medium", TIER[tier].soft, TIER[tier].text)}>
        {diff > 0 ? "+" : ""}{diff}%
      </span>
    </div>
  );
}

/* ---------- Strategy ---------- */
function Strategy({ audit }: { audit: Audit }) {
  const plan = [
    ["Weeks 1-2", "Fix the snippets", `Rewrite titles and descriptions for the ${audit.lowCtr.length || "top"} low click-rate pages. Add FAQ or review markup where relevant. Check results after 3-4 weeks.`],
    ["Weeks 2-5", "Stop the leaks", "Refresh pages losing traffic: update facts and dates, expand thin sections, and compare with what currently ranks top 3."],
    ["Weeks 4-8", "Push page two", "For each ‘almost page one’ search: target it clearly in headings, add depth, and link to it from 3-5 popular pages."],
    ["Weeks 6-12", "Fill content gaps", "Publish comparison pages, templates and question-led guides that link back to your key product pages."],
    ["Every month", "Measure and repeat", "Re-run this audit. Track clicks, click rate vs typical, and number of searches in the top 10."],
  ];
  return (
    <Section id="strategy" title="What this means & what to do" lead="Plain-language explanations and a step-by-step growth plan.">
      <Accordion type="multiple" defaultValue={["meaning"]} className="space-y-3">
        <AccordionItem value="meaning" className="rounded-xl border bg-card px-5 shadow-card">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">What the findings mean for the business</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 pb-2 md:grid-cols-3">
              <Explain tier="critical" title="Low click rate = wasted visibility" text={`Google already shows these pages ${fmt(audit.lowCtr.reduce((s, f) => s + f.row.impressions, 0))} times. Weak titles send those visitors — and customers — to competitors. It's the cheapest traffic to win back.`} />
              <Explain tier="high" title="Losing traffic = shrinking revenue" text={audit.hasComparison ? `${audit.decaying.length} searches are sliding. Left alone, competitors with fresher pages keep taking ground. Protecting traffic costs far less than winning new traffic.` : "Without a comparison period we can't measure this, but unrefreshed content usually loses 10-30% of traffic a year."} />
              <Explain tier="medium" title="Page two = hidden pipeline" text={`${audit.striking.length} searches sit just off page one. Moving up typically multiplies clicks 5-10×, and Google already sees these pages as relevant.`} />
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="plan" className="rounded-xl border bg-card px-5 shadow-card">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">Your 90-day growth plan</AccordionTrigger>
          <AccordionContent>
            <ol className="relative ml-2 space-y-6 border-l pb-2 pl-6">
              {plan.map(([when, t, d]) => (
                <li key={t} className="relative">
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                  <div className="text-xs font-medium text-primary">{when}</div>
                  <div className="font-semibold">{t}</div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Section>
  );
}

function Explain({ tier, title, text }: { tier: Tier; title: string; text: string }) {
  return (
    <div className={cn("rounded-lg p-4", TIER[tier].soft)}>
      <div className={cn("text-sm font-semibold", TIER[tier].text)}>{title}</div>
      <p className="mt-2 text-sm text-foreground/80">{text}</p>
    </div>
  );
}
