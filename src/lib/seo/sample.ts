import type { Dataset, Row } from "./types";

// Deterministic pseudo-random so the demo is stable across reloads.
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

type Seed = [query: string, page: string, impressions: number, position: number, ctrFactor: number, trend: number];

const SEEDS: Seed[] = [
  ["project management software", "/", 48000, 6.2, 0.6, 0.9],
  ["best project management tools", "/blog/best-pm-tools", 36000, 4.1, 0.45, 0.7],
  ["kanban board online", "/features/kanban", 21000, 3.2, 1.1, 1.05],
  ["free gantt chart maker", "/features/gantt", 18500, 12.4, 1, 1.1],
  ["gantt chart template excel", "/templates/gantt-excel", 15400, 14.8, 1, 1.3],
  ["project timeline template", "/templates/timeline", 12800, 9.4, 0.5, 0.95],
  ["agile sprint planning", "/blog/sprint-planning-guide", 11200, 11.3, 1, 1.0],
  ["resource management tool", "/features/resources", 9800, 17.6, 1, 1.0],
  ["asana alternative", "/compare/asana", 9100, 8.1, 0.7, 1.2],
  ["trello vs asana", "/blog/trello-vs-asana", 8700, 5.5, 0.4, 0.6],
  ["monday alternative", "/compare/monday", 7600, 13.2, 1, 1.15],
  ["team workload view", "/features/workload", 6400, 15.9, 1, 1.0],
  ["how to write a project brief", "/blog/project-brief", 6100, 2.3, 1.2, 0.55],
  ["raci chart template", "/templates/raci", 5900, 3.8, 0.35, 0.8],
  ["project status report template", "/templates/status-report", 5400, 18.7, 1, 1.0],
  ["okr software", "/features/goals", 4800, 19.4, 1, 0.9],
  ["time tracking for teams", "/features/time-tracking", 4600, 7.2, 0.9, 0.62],
  ["remote team collaboration tools", "/blog/remote-collaboration", 4300, 10.8, 1, 0.5],
  ["project management certification", "/blog/pm-certifications", 3900, 6.9, 0.5, 0.68],
  ["task dependencies", "/help/dependencies", 3300, 4.4, 1.1, 1.0],
  ["pm software pricing", "/pricing", 2900, 2.1, 1.3, 1.0],
  ["brand name login", "/login", 2600, 1.1, 1.4, 1.0],
  ["critical path method", "/blog/critical-path", 8200, 16.1, 1, 0.85],
  ["work breakdown structure example", "/blog/wbs-examples", 7300, 11.9, 1, 1.05],
  ["scrum vs kanban", "/blog/scrum-vs-kanban", 10400, 7.8, 0.55, 0.58],
];

const BASE_CTR = [0.28, 0.16, 0.11, 0.085, 0.064, 0.05, 0.04, 0.034, 0.028, 0.025, 0.012, 0.011, 0.01, 0.009, 0.008, 0.007, 0.0065, 0.006, 0.0055, 0.005];

export function buildSampleDataset(): Dataset {
  const r = rng(42);
  const rows: Row[] = SEEDS.map(([query, page, imp, pos, f, trend]) => {
    const impressions = Math.round(imp * (0.92 + r() * 0.16));
    const ctr = BASE_CTR[Math.min(19, Math.round(pos) - 1)] * f * (0.9 + r() * 0.2);
    const clicks = Math.round(impressions * ctr);
    const prevImpressions = Math.round(impressions / Math.max(0.4, trend * (0.95 + r() * 0.1)));
    const prevPosition = trend < 0.8 ? Math.max(1, pos - (1 - trend) * 6) : pos + (trend - 1) * 4;
    const prevCtr = BASE_CTR[Math.min(19, Math.max(0, Math.round(prevPosition) - 1))] * f;
    return {
      query,
      page: "https://acmeplan.io" + page,
      impressions,
      clicks,
      ctr: clicks / impressions,
      position: pos,
      prevImpressions,
      prevClicks: Math.round(prevImpressions * prevCtr),
      prevPosition: Math.round(prevPosition * 10) / 10,
    };
  });
  return { name: "AcmePlan — demo SaaS site (last 3 months vs previous)", site: "acmeplan.io", industry: "saas", rows };
}
