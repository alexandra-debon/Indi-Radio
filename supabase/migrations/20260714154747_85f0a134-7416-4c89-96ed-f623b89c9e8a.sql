
CREATE TABLE public.artwork_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist text NOT NULL,
  title text NOT NULL,
  source text,
  found boolean NOT NULL,
  duration_ms integer NOT NULL,
  attempts jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.artwork_lookups TO authenticated;
GRANT ALL ON public.artwork_lookups TO service_role;
ALTER TABLE public.artwork_lookups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read artwork lookups"
  ON public.artwork_lookups FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX artwork_lookups_created_at_idx ON public.artwork_lookups (created_at DESC);
CREATE INDEX artwork_lookups_found_idx ON public.artwork_lookups (found, created_at DESC);
