ALTER TABLE public.village_articles DROP CONSTRAINT IF EXISTS village_articles_category_check;

ALTER TABLE public.village_articles
  ADD CONSTRAINT village_articles_category_check
  CHECK (category IS NULL OR category = ANY (ARRAY[
    'musique'::text, 'livre'::text, 'art'::text,
    'cinema'::text, 'photographie'::text, 'arts_visuels'::text, 'danse'::text
  ]));

ALTER TABLE public.village_articles ADD COLUMN IF NOT EXISTS free_tag text;

ALTER TABLE public.village_articles
  ADD CONSTRAINT village_articles_free_tag_len CHECK (free_tag IS NULL OR char_length(free_tag) <= 40);

GRANT SELECT (free_tag) ON public.village_articles TO anon;
GRANT SELECT (free_tag), INSERT (free_tag), UPDATE (free_tag) ON public.village_articles TO authenticated;