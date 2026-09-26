import type { Row } from "./types";

function parseLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function num(v: string | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const pct = v.includes("%");
  const n = parseFloat(v.replace(/[%\s,]/g, (m) => (m === "," ? "" : "")));
  if (isNaN(n)) return undefined;
  return pct ? n / 100 : n;
}

/**
 * Parses Google Search Console CSV exports (Queries.csv, Pages.csv, or a
 * query+page export). Supports "compare" exports with Previous-period columns.
 */
export function parseGscCsv(text: string): Row[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("The file looks empty.");
  const delim = lines[0].includes("\t") ? "\t" : lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
  const headers = parseLine(lines[0], delim).map((h) => h.toLowerCase());

  const find = (test: (h: string) => boolean) => headers.findIndex(test);
  const isPrev = (h: string) => /previous|prior|before/.test(h);
  const qi = find((h) => /quer|keyword/.test(h));
  const pi = find((h) => /page|url|landing/.test(h));
  const ci = find((h) => /click/.test(h) && !isPrev(h));
  const ii = find((h) => /impression/.test(h) && !isPrev(h));
  const ti = find((h) => /ctr/.test(h) && !isPrev(h));
  const posi = find((h) => /position|rank/.test(h) && !isPrev(h));
  const pci = find((h) => /click/.test(h) && isPrev(h));
  const pii = find((h) => /impression/.test(h) && isPrev(h));
  const ppi = find((h) => /(position|rank)/.test(h) && isPrev(h));

  if (ii < 0 || posi < 0 || (qi < 0 && pi < 0))
    throw new Error("Couldn't find Impressions, Position and Query/Page columns. Export Queries or Pages from Search Console Performance.");

  const rows: Row[] = [];
  for (const line of lines.slice(1)) {
    const c = parseLine(line, delim);
    const impressions = num(c[ii]) ?? 0;
    if (!impressions) continue;
    const clicks = ci >= 0 ? num(c[ci]) ?? 0 : 0;
    rows.push({
      query: qi >= 0 ? c[qi] : "",
      page: pi >= 0 ? c[pi] : "",
      clicks,
      impressions,
      ctr: ti >= 0 ? num(c[ti]) ?? clicks / impressions : clicks / impressions,
      position: num(c[posi]) ?? 0,
      prevClicks: pci >= 0 ? num(c[pci]) : undefined,
      prevImpressions: pii >= 0 ? num(c[pii]) : undefined,
      prevPosition: ppi >= 0 ? num(c[ppi]) : undefined,
    });
  }
  if (!rows.length) throw new Error("No rows with impressions were found.");
  return rows;
}
