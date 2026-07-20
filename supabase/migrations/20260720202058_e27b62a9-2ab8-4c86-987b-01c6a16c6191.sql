
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS image_captions text[] NOT NULL DEFAULT '{}';
