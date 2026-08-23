ALTER TABLE public.news_posts
  ADD COLUMN IF NOT EXISTS embed_url text,
  ADD COLUMN IF NOT EXISTS embed_height integer;