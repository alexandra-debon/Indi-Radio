CREATE TABLE public.seo_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path text NOT NULL,
  lang text NOT NULL CHECK (lang IN ('fr','en')),
  title text,
  description text,
  og_image_url text,
  canonical_url text,
  keywords text,
  noindex boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (path, lang)
);

CREATE INDEX seo_overrides_path_idx ON public.seo_overrides (path);

GRANT SELECT ON public.seo_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_overrides TO authenticated;
GRANT ALL ON public.seo_overrides TO service_role;

ALTER TABLE public.seo_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SEO overrides are publicly readable"
  ON public.seo_overrides FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert SEO overrides"
  ON public.seo_overrides FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update SEO overrides"
  ON public.seo_overrides FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete SEO overrides"
  ON public.seo_overrides FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_seo_overrides_updated_at
  BEFORE UPDATE ON public.seo_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();