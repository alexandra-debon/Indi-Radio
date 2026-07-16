ALTER TABLE public.podcasts ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS duration_seconds integer;