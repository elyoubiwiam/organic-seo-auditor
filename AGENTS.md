<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Audit analysis runs fully client-side in src/lib/seo (pure functions over GSC rows) — works for demo, CSV, and a future Search Console source without a backend.
- Per-user Search Console uses custom Google OAuth (no per-user GSC connector exists); refresh tokens AES-GCM encrypted in gsc_connections, which has no client policies — only server fns touch it after requireSupabaseAuth.
- Audits are stored per user in `audits` with RLS user_id = auth.uid(); AI analysis runs server-side via Lovable AI Gateway on aggregated findings, reading the audit through the user's RLS client.
