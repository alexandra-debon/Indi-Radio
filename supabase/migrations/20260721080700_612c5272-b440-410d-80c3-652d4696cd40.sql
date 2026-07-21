
ALTER TABLE public.news_posts
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_captions text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.news_comments
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_captions text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_captions text[] NOT NULL DEFAULT '{}';
