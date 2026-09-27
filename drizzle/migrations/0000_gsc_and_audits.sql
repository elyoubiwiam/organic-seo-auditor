CREATE TABLE public.gsc_connections (
  user_id uuid PRIMARY KEY,
  refresh_token_encrypted text NOT NULL,
  google_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.gsc_connections TO service_role;
ALTER TABLE public.gsc_connections ENABLE ROW LEVEL SECURITY;
-- No client policies: only the server (after verifying the user) touches tokens.

CREATE TABLE public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  site text NOT NULL,
  industry text NOT NULL,
  source text NOT NULL,
  rows jsonb NOT NULL,
  ai_analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audits TO authenticated;
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audits select" ON public.audits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own audits insert" ON public.audits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own audits update" ON public.audits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own audits delete" ON public.audits FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX audits_user_created ON public.audits(user_id, created_at DESC);