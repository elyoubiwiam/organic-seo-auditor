# Connect Google Search Console (private to the owner)

## What it does (short)
Instead of exporting a CSV, you link your Google account once. The app lists the websites you manage in Search Console, you pick one, and it pulls the last 3 months of search data (plus the 3 months before, to spot searches losing traffic). The same audit report runs on that live data.

## Keeping the data private
Google connection happens once, on your side, with your account. There is no way yet for each visitor to connect their own Google account for Search Console. So privacy works through a login:
- You sign in to the app (email or Google). Your account is marked as the owner.
- Only the owner can see the "Connect Search Console" card, the site list and the live data.
- Everyone else only sees the demo and CSV upload. Even if someone tries to reach the data directly, the server refuses them.
- Nothing from Search Console is saved or shared; it's fetched when you run the audit.

## What changes on the start screen
- A small "Sign in" link at the top.
- Signed in as owner: the "coming soon" box becomes "Connect Search Console" with a site picker, the industry picker and "Run audit".
- Signed out or not the owner: the box says "Sign in as the owner to use live Search Console data".
- Clear messages when no site is found, access is refused, or Google returns an error.

## Steps
1. Turn on Lovable Cloud for login, and add a sign-in page.
2. Add an owner role; you become the owner (the first account that signs up gets it).
3. Link Google Search Console to the project (a connect card will appear for you to sign in with Google).
4. Add the server steps that list sites and fetch data, allowed for the owner only.
5. Replace the "coming soon" box and test end to end signed in as owner and as a non-owner.

## Technical details
- Cloud auth (email/password + Google via Lovable broker), `/auth` page, `onAuthStateChange` in `__root.tsx`.
- `app_role` enum + `user_roles` table + `has_role()` security-definer function (with grants + RLS). Trigger grants `admin` to the first user only.
- `src/lib/seo/gsc.functions.ts`: `listSites` and `fetchPerformance({ siteUrl })` with `.middleware([requireSupabaseAuth])`, then `has_role(userId,'admin')` check, else 403. Sites listed via GET `/webmasters/v3/sites` (verified only); chosen `siteUrl` re-validated against that list; POST `searchAnalytics/query`, dimensions `query,page`, rowLimit 5000, two 3-month windows ending 3 days ago. Gateway with `LOVABLE_API_KEY` + `GOOGLE_SEARCH_CONSOLE_API_KEY`, read in handlers; errors surface status and body.
- Merge previous period by `query|page` into `prev*` fields; analysis stays client-side in `src/lib/seo`.
- `src/components/audit/GscConnect.tsx` via `useServerFn` + react-query; `src/start.ts` gets the auth attacher.
