# Connect Google Search Console

## What it does (short)
Instead of exporting a CSV, you link your Google account once. The app then lists the websites you manage in Search Console, you pick one, and it pulls the last 3 months of search data (plus the 3 months before, to spot searches losing traffic). The same audit report runs on that live data.

Note: the link uses one Google account (yours, as the app owner). Anyone using the app would see the sites that account can access. Letting each visitor sign in with their own Google account is a bigger, separate project.

## What changes on the start screen
- The "Direct Search Console connection — coming soon" box becomes a real "Connect Search Console" card with a one-line explanation.
- After linking: a site picker, the industry picker, and a "Run audit" button.
- Clear messages when no site is found, access is refused, or Google returns an error.
- Demo and CSV upload stay unchanged.

## Steps
1. Link the Google Search Console connection to the project (a connect card will appear for you to sign in with Google).
2. Add server functions: list sites, and fetch query+page performance for the current and previous 3-month windows, merged into the existing row format.
3. Replace the "coming soon" box with the connect/picker card; results feed the existing report.
4. Test end to end with the linked account.

## Technical details
- `src/lib/seo/gsc.functions.ts`: `listSites` (GET `/webmasters/v3/sites`) and `fetchPerformance({ siteUrl })` (POST `/webmasters/v3/sites/{site}/searchAnalytics/query`, dimensions `query,page`, rowLimit 5000, two date ranges ending 3 days ago). Calls go through the connector gateway with `LOVABLE_API_KEY` + `GOOGLE_SEARCH_CONSOLE_API_KEY`, read inside handlers; non-OK responses surface status and body.
- Merge previous-period rows by `query|page` into `prevClicks/prevImpressions/prevPosition`; CTR as 0-1. Analysis stays client-side in `src/lib/seo`.
- New `src/components/audit/GscConnect.tsx` using `useServerFn` + react-query; rendered in `src/routes/index.tsx`.
- No database or login needed.
