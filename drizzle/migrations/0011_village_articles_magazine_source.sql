ALTER TABLE public.village_articles
  ADD COLUMN IF NOT EXISTS magazine_url text,
  ADD COLUMN IF NOT EXISTS source_kind text;

ALTER TABLE public.village_articles
  DROP CONSTRAINT IF EXISTS village_articles_source_kind_check;

ALTER TABLE public.village_articles
  ADD CONSTRAINT village_articles_source_kind_check
  CHECK (source_kind IS NULL OR source_kind IN ('article_interactif', 'extrait_magazine'));

GRANT SELECT (magazine_url, source_kind) ON public.village_articles TO anon;
GRANT SELECT (magazine_url, source_kind), INSERT (magazine_url, source_kind), UPDATE (magazine_url, source_kind) ON public.village_articles TO authenticated;
GRANT ALL ON public.village_articles TO service_role;