import type { IndustryKey } from "./types";

// Approximate organic CTR by position (1-20), blended from public industry CTR studies.
const BASE = [
  0.276, 0.158, 0.11, 0.084, 0.063, 0.049, 0.039, 0.033, 0.027, 0.024,
  0.012, 0.011, 0.01, 0.009, 0.008, 0.007, 0.0065, 0.006, 0.0055, 0.005,
];

const MULT: Record<IndustryKey, number> = {
  ecommerce: 0.85, // shopping ads & carousels push results down
  saas: 1.0,
  publishing: 1.15,
  local: 0.8, // map pack takes clicks
};

export const INDUSTRIES: { key: IndustryKey; label: string }[] = [
  { key: "ecommerce", label: "E-commerce" },
  { key: "saas", label: "B2B SaaS" },
  { key: "publishing", label: "Publishing / Media" },
  { key: "local", label: "Local services" },
];

export function benchmarkCtr(position: number, industry: IndustryKey): number {
  const p = Math.max(1, Math.min(20, Math.round(position)));
  return BASE[p - 1] * MULT[industry];
}

export function benchmarkCurve(industry: IndustryKey) {
  return BASE.map((_, i) => ({ position: i + 1, benchmark: benchmarkCtr(i + 1, industry) }));
}
