ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_category_check
  CHECK (category IS NULL OR category IN ('musique', 'livre', 'art'));

CREATE INDEX IF NOT EXISTS posts_category_idx ON public.posts (category) WHERE category IS NOT NULL;