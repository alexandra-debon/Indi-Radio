ALTER TABLE public.village_articles ADD COLUMN IF NOT EXISTS source_post_id uuid;
CREATE INDEX IF NOT EXISTS village_articles_source_post_id_idx ON public.village_articles (source_post_id);
GRANT SELECT ON public.village_articles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.village_articles TO authenticated;
GRANT ALL ON public.village_articles TO service_role;