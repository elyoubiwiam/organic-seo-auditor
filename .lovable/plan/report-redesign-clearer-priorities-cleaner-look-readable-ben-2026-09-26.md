# Report redesign: clearer priorities, cleaner look, readable benchmarks

## 1. New visual direction
- Swap the serif + green/lime look for a calm, modern "analytics studio" style:
  - Fonts: **Geist** for everything (headings semibold, tight tracking), **Geist Mono** only for numbers.
  - Colours: soft off-white background, near-black slate text, one confident accent (deep cobalt blue) for actions and links.
  - Priority colour scale used consistently everywhere:
    - Critical: soft red
    - High: amber
    - Medium: blue
    - Low / healthy: green
- Softer cards (rounded, light border, subtle shadow), more white space, fewer boxes-within-boxes.
- Same style applied to the start screen so the whole app feels consistent.

## 2. Report layout: show less at first, reveal on demand
Reorder so the most important information comes first, and details are one click away.

```text
[ Header: site name · industry picker · New audit ]

1. Overview
   Score + one-sentence verdict ("You're missing ~4,000 clicks/month")
   4 key numbers (clicks, impressions, CTR, avg position)
   Priority bar: 3 critical · 5 high · 9 medium · 8 low

2. Top 3 priorities  (big cards, colour-coded, "why" + "what to do")
   -> "See all 10 recommendations" expands the rest

3. Issues  (tabs instead of three long lists)
   [ Low CTR (6) ] [ Losing traffic (5) ] [ Almost page one (14) ]
   Each row: coloured priority dot, keyword, one plain metric, gain
   Show top 5, "Show more" for the rest; click a row for the fix

4. Benchmarks  (redesigned, see section 3)

5. Strategy & 90-day plan  (collapsible sections, closed by default
   except the first; timeline style instead of a dense dark block)
```

- Plain-language labels: "Losing traffic" instead of "Decaying queries", "Almost page one" instead of "Striking distance" (with the technical term shown small underneath).
- Each finding gets a priority level (critical/high/medium/low) based on the estimated click gain, shown as a coloured dot and badge.
- The side menu stays on large screens but becomes a short list matching the 5 sections.

## 3. Benchmarks you can understand
Replace the confusing line chart with:
- **A plain-English headline** first, e.g. "At positions 4-10 you get about half the clicks a typical SaaS site gets."
- **A simple position-by-position comparison** (positions 1-10) using paired bars: "You" vs "Typical site", with each row coloured green (above average), amber (slightly below) or red (well below), and a label like "−52%".
- A short "How to read this" line: "When people see your result at position 5, typically 6% click it. You get 3%."
- Positions 11-20 grouped into one "Page two" row, since clicks there are tiny.
- Content gap cards kept, restyled with the priority colours and sorted by potential.

## Technical details
- Update `src/styles.css` tokens (new palette, priority tokens `--critical`, `--high`, `--medium`, `--low` with soft background variants) and load Geist fonts in `__root.tsx`.
- Add a priority tier to findings/recommendations in `src/lib/seo/analyze.ts` and a benchmark summary (per-position ratio + headline text). The analysis stays client-side.
- Rebuild `src/components/audit/Report.tsx` into smaller pieces (Overview, TopPriorities, IssuesTabs, Benchmarks, Strategy) using existing shadcn Tabs, Accordion and Badge.
- Restyle `src/routes/index.tsx` to match.
- Verify with the demo audit in the browser, including the benchmark section.
