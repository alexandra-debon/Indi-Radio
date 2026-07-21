
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.coups_de_coeur (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  featured_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cover_url TEXT,
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'album',
  comment TEXT NOT NULL,
  discovery_story TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coups_de_coeur TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coups_de_coeur TO authenticated;
GRANT ALL ON public.coups_de_coeur TO service_role;

ALTER TABLE public.coups_de_coeur ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published coups de coeur"
  ON public.coups_de_coeur FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert coups de coeur"
  ON public.coups_de_coeur FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update coups de coeur"
  ON public.coups_de_coeur FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete coups de coeur"
  ON public.coups_de_coeur FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER coups_de_coeur_set_updated_at
  BEFORE UPDATE ON public.coups_de_coeur
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE INDEX coups_de_coeur_featured_date_idx ON public.coups_de_coeur (featured_date DESC);
