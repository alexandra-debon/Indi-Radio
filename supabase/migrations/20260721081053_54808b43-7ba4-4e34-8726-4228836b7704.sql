
ALTER TABLE public.content_comments
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_captions text[] NOT NULL DEFAULT '{}';
