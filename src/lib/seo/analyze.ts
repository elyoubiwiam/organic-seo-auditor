import { benchmarkCtr } from "./benchmarks";
import type { Dataset, Row } from "./types";

export type Severity = "high" | "medium" | "low";

export type Finding = {
  row: Row;
  label: string;
  metric: string;
  opportunity: number; // estimated extra monthly clicks
  severity: Severity;
  fix: string;
};

export type Recommendation = {
  title: string;
  detail: string;
  impact: number;
  effort: "Low" | "Medium" | "High";
  category: string;
};

export type Gap = { theme: string; evidence: string; idea: string; potential: number };

export type Audit = {
  totals: { clicks: number; impressions: number; ctr: number; position: number; clicksDelta?: number | undefined };
  score: number;
  lowCtr: Finding[];
  decaying: Finding[];
  striking: Finding[];
  recommendations: Recommendation[];
  ctrVsBenchmark: { position: number; site?: number | undefined; benchmark: number }[];
  gaps: Gap[];
  hasComparison: boolean;
};

const label = (r: Row) => r.query || r.page.replace(/^https?:\/\/[^/]+/, "") || "/";
const sev = (n: number, hi: number, md: number): Severity => (n >= hi ? "high" : n >= md ? "medium" : "low");
const perMonth = (n: number) => Math.round(n / 3); // GSC default window ~3 months

export function runAudit(ds: Dataset): Audit {
  const rows = ds.rows;
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const position = rows.reduce((s, r) => s + r.position * r.impressions, 0) / impressions;
  const hasComparison = rows.some((r) => r.prevClicks != null);
  const prevClicks = rows.reduce((s, r) => s + (r.prevClicks ?? 0), 0);

  // 1. High impressions, low CTR vs benchmark (top 10 positions)
  const impThreshold = [...rows].sort((a, b) => b.impressions - a.impressions)[Math.floor(rows.length * 0.5)]?.impressions ?? 0;
  const lowCtr: Finding[] = rows
    .filter((r) => r.position <= 10 && r.impressions >= impThreshold)
    .map((r) => {
      const bench = benchmarkCtr(r.position, ds.industry);
      const gap = bench - r.ctr;
      return { r, bench, gap };
    })
    .filter((x) => x.gap > 0 && x.r.ctr < x.bench * 0.75)
    .map(({ r, bench, gap }) => {
      const opp = perMonth(gap * r.impressions);
      return {
        row: r,
        label: label(r),
        metric: `CTR ${(r.ctr * 100).toFixed(1)}% vs ${(bench * 100).toFixed(1)}% expected at #${r.position.toFixed(1)}`,
        opportunity: opp,
        severity: sev(opp, 400, 100),
        fix: "Rewrite the title tag and meta description to match search intent, add the year / a number / a clear benefit, and add FAQ or review structured data for richer snippets.",
      };
    })
    .sort((a, b) => b.opportunity - a.opportunity);

  // 2. Decaying queries
  const decaying: Finding[] = hasComparison
    ? rows
        .filter((r) => (r.prevClicks ?? 0) >= 20 && r.clicks < (r.prevClicks ?? 0) * 0.8)
        .map((r) => {
          const lost = (r.prevClicks ?? 0) - r.clicks;
          const drop = lost / (r.prevClicks ?? 1);
          const posLost = r.prevPosition != null ? r.position - r.prevPosition : 0;
          return {
            row: r,
            label: label(r),
            metric: `Clicks −${Math.round(drop * 100)}% (${r.prevClicks} → ${r.clicks})${posLost > 0.5 ? `, rank slipped ${posLost.toFixed(1)}` : ""}`,
            opportunity: perMonth(lost),
            severity: sev(drop, 0.4, 0.25),
            fix: posLost > 0.5
              ? "Rankings slipped: refresh the content with up-to-date facts, expand sections competitors cover, and add internal links from strong pages."
              : "Rank held but demand or SERP layout changed: check for new SERP features (AI answers, videos) and adapt the format; update the title for freshness.",
          };
        })
        .sort((a, b) => b.opportunity - a.opportunity)
    : [];

  // 3. Striking distance (positions 11-20)
  const striking: Finding[] = rows
    .filter((r) => r.position > 10 && r.position <= 20)
    .map((r) => {
      const target = benchmarkCtr(8, ds.industry);
      const opp = perMonth(Math.max(0, target - r.ctr) * r.impressions);
      return {
        row: r,
        label: label(r),
        metric: `#${r.position.toFixed(1)} · ${r.impressions.toLocaleString()} impressions`,
        opportunity: opp,
        severity: sev(opp, 300, 80),
        fix: "Add the exact query to the H1/H2 and intro, expand depth to beat page-one results, and point 3-5 internal links at this page with relevant anchor text.",
      };
    })
    .sort((a, b) => b.opportunity - a.opportunity);

  // CTR curve vs benchmark
  const ctrVsBenchmark = Array.from({ length: 20 }, (_, i) => {
    const p = i + 1;
    const bucket = rows.filter((r) => Math.round(r.position) === p);
    const imp = bucket.reduce((s, r) => s + r.impressions, 0);
    const clk = bucket.reduce((s, r) => s + r.clicks, 0);
    return { position: p, site: imp ? clk / imp : undefined, benchmark: benchmarkCtr(p, ds.industry) };
  });

  // Content gap heuristics
  const gaps: Gap[] = [];
  const has = (re: RegExp) => rows.filter((r) => re.test(r.query));
  const compare = has(/\b(vs|alternative|alternatives|compare)\b/);
  if (compare.length)
    gaps.push({
      theme: "Competitor comparison pages",
      evidence: `${compare.length} "vs / alternative" queries earn ${compare.reduce((s, r) => s + r.impressions, 0).toLocaleString()} impressions.`,
      idea: "Build a dedicated comparison hub and one page per major competitor with honest feature tables — these queries convert at high intent.",
      potential: perMonth(compare.reduce((s, r) => s + r.impressions, 0) * 0.04),
    });
  const templates = has(/\b(template|example|examples)\b/).filter((r) => r.position > 5);
  if (templates.length)
    gaps.push({
      theme: "Templates & examples library",
      evidence: `${templates.length} template/example queries rank below the top 5.`,
      idea: "Competitors win these with downloadable assets. Publish free, gated-optional templates with preview images and HowTo schema.",
      potential: perMonth(templates.reduce((s, r) => s + r.impressions, 0) * 0.05),
    });
  const howto = has(/^(how|what|why|when)\b/);
  gaps.push({
    theme: "Question-led guides",
    evidence: howto.length ? `Only ${howto.length} question queries detected — thin coverage of top-of-funnel intent.` : "No question-style queries rank — competitors likely own informational demand.",
    idea: "Map 'how to / what is' questions around your core topic and publish concise answer-first guides that link to product pages.",
    potential: Math.round(impressions * 0.01 / 3),
  });
  const cannibal = Object.entries(
    rows.reduce<Record<string, Set<string>>>((m, r) => {
      if (!r.query || !r.page) return m;
      (m[r.query] ??= new Set()).add(r.page);
      return m;
    }, {}),
  ).filter(([, s]) => s.size > 1);
  if (cannibal.length)
    gaps.push({
      theme: "Keyword cannibalisation",
      evidence: `${cannibal.length} queries are split across multiple pages.`,
      idea: "Consolidate competing pages into one canonical page and 301-redirect the rest so authority isn't diluted.",
      potential: cannibal.length * 30,
    });

  // Quick-win recommendations
  const recs: Recommendation[] = [];
  lowCtr.slice(0, 3).forEach((f) =>
    recs.push({ category: "Snippet", title: `Rewrite title & description for "${f.label}"`, detail: f.fix, impact: f.opportunity, effort: "Low" }),
  );
  striking.slice(0, 3).forEach((f) =>
    recs.push({ category: "Ranking", title: `Push "${f.label}" onto page one`, detail: f.fix, impact: f.opportunity, effort: "Medium" }),
  );
  decaying.slice(0, 2).forEach((f) =>
    recs.push({ category: "Refresh", title: `Refresh content ranking for "${f.label}"`, detail: f.fix, impact: f.opportunity, effort: "Medium" }),
  );
  gaps.slice(0, 2).forEach((g) =>
    recs.push({ category: "Content gap", title: g.theme, detail: g.idea, impact: g.potential, effort: "High" }),
  );
  recs.sort((a, b) => b.impact / effortW(b.effort) - a.impact / effortW(a.effort));

  const avgCtrRatio =
    rows.filter((r) => r.position <= 10).reduce((s, r) => s + Math.min(1.5, r.ctr / benchmarkCtr(r.position, ds.industry)) * r.impressions, 0) /
    Math.max(1, rows.filter((r) => r.position <= 10).reduce((s, r) => s + r.impressions, 0));
  const top10Share = rows.filter((r) => r.position <= 10).reduce((s, r) => s + r.impressions, 0) / impressions;
  const decayPenalty = hasComparison ? Math.min(20, decaying.length * 3) : 0;
  const score = Math.max(0, Math.min(100, Math.round(avgCtrRatio * 45 + top10Share * 45 + 10 - decayPenalty)));

  return {
    totals: { clicks, impressions, ctr: clicks / impressions, position, clicksDelta: hasComparison && prevClicks ? (clicks - prevClicks) / prevClicks : undefined },
    score,
    lowCtr,
    decaying,
    striking,
    recommendations: recs,
    ctrVsBenchmark,
    gaps,
    hasComparison,
  };
}

function effortW(e: Recommendation["effort"]) {
  return e === "Low" ? 1 : e === "Medium" ? 2 : 3.5;
}
