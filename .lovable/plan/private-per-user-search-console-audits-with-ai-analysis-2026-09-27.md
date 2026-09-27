# Private per-user Search Console audits with AI analysis

## What it does (short)
Each visitor creates an account, links their own Google Search Console, picks one of their sites, and gets an audit plus an AI-written analysis: what's really happening, why, and a prioritised plan to improve. It doesn't replace Google's tool — it explains the data and tells you what to do. Past audits are saved to their account.

## Privacy
- Each person only ever sees their own sites and audits. Not you, not other users.
- Their Google access is stored encrypted and only used when they run an audit. They can disconnect anytime, which deletes it.
- Saved audits are locked to their account by database rules; the server also checks the signed-in person on every request.
- You, as the owner, won't have a screen showing anyone's data.

## What you'll need to do (one-time)
Google requires every app reading Search Console to have its own Google sign-in setup. I'll guide you step by step:
1. Create a free Google Cloud project and turn on the Search Console API.
2. Create sign-in credentials and paste in the web address I give you.
3. Paste the two codes into the secure form I'll open.
Until Google reviews the app, up to 100 people you list as testers can use it. For public launch you submit it to Google for review (privacy policy page needed — I'll add one).

## What visitors will see
- Sign up / sign in (email or Google).
- "Connect Search Console" button, then a site picker and industry picker, then "Run audit".
- The existing report, plus a new "AI analysis" section at the top: summary, key insights, root causes, and a step-by-step 90-day plan.
- "My audits" page listing saved audits to reopen or delete.
- Demo and CSV upload stay (CSV audits can also get AI analysis and be saved).

## Steps
1. Turn on Lovable Cloud: accounts, database, AI.
2. Build sign-in, "My audits", and privacy policy pages.
3. Guide you through Google setup and collect the two codes securely.
4. Build the Google link (connect, pick site, fetch 2 x 3 months, disconnect).
5. Add AI analysis and save audits.
6. Test end to end with two different accounts to confirm neither sees the other's data.

## Technical details
- Cloud auth: email/password + Google (broker). `_authenticated/` for `/audits`, `/audits/$id`; `/auth`, `/privacy` public.
- Tables (grants + RLS `user_id = auth.uid()`): `gsc_connections(user_id pk, refresh_token_encrypted, google_email, created_at)` — no client SELECT on token; `audits(id, user_id, site, industry, source, rows jsonb, audit jsonb, ai_analysis jsonb, created_at)`.
- Custom OAuth: secrets `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, generated `TOKEN_ENCRYPTION_KEY`, `OAUTH_STATE_SECRET`. Scope `webmasters.readonly`, `access_type=offline`, `prompt=consent`. Start via server fn returning auth URL with signed state (userId + nonce); callback at `/api/public/gsc/callback` verifies state, exchanges code, AES-GCM encrypts refresh token, upserts via admin client after state check.
- Server fns (`requireSupabaseAuth`): `gscStatus`, `listSites` (verified only), `fetchPerformance({siteUrl})` (re-validates siteUrl, refreshes access token, `query,page` rows, 2 windows), `disconnectGsc` (revokes + deletes), `generateAiAnalysis({auditId})` via Lovable AI Gateway (google/gemini-3-flash-preview, structured output from aggregated findings, not raw PII), `saveAudit`, `listAudits`, `deleteAudit`.
- Analysis engine stays client-side in `src/lib/seo`; AI section added to `Report.tsx`.
