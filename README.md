# Organic Auditor (SEO Insights Hub)

**Private Search Console audits with AI insights and a clear plan to grow organic traffic.**

Upload a Google Search Console export, or connect Search Console directly. Organic Auditor finds the pages, queries and keywords where you are losing traffic, explains them in plain business language, and turns them into a 90-day plan.

**Live app:** https://organic-seo-auditor.lovable.app

---

## What it finds

- **Pages people see but don't click:** high-impression, low-CTR pages where better titles and descriptions can win traffic quickly.
- **Keywords almost on page one:** striking-distance queries ranking in positions 11 to 20.
- **Decaying queries:** searches that are losing clicks or impressions over time.
- **Keyword cannibalisation:** several pages competing for the same query.
- **Content gaps:** missing content types such as competitor comparison pages, template libraries and question-led guides.
- **CTR vs. industry benchmarks:** your click-through rate by position, compared with benchmark curves.

## Key features

- **Try the demo audit:** a realistic sample dataset for a fictional SaaS site, with no account needed.
- **Three ways to bring data:** the demo, a Search Console CSV upload, or a direct Google Search Console connection.
- **AI strategic analysis:** what each finding means for the business, step-by-step guidance, and a 90-day action plan.
- **Saved audits:** sign in to keep a private history of your audits under *My audits*.
- **Private by design:** each user's Search Console link and data are visible only to them, and the connection can be removed at any time.

## Tech stack

- React, TypeScript, TanStack Start and Router, Vite
- Tailwind CSS with shadcn/ui components and Recharts
- Lovable Cloud (Supabase) for authentication, database and saved audits
- Google Search Console API through OAuth
- AI analysis through server functions
- Built and hosted with [Lovable](https://lovable.dev)

## Roadmap

- [ ] End-to-end test of the Google Search Console connection with a verified site

---

Built by **Wiam El Youbi**.
