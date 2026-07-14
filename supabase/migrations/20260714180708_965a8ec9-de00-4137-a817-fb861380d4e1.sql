
ALTER TABLE public.episodes ALTER COLUMN podcast_id DROP NOT NULL;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS show_id uuid REFERENCES public.shows(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS episodes_show_idx ON public.episodes (show_id, published_at DESC);
ALTER TABLE public.episodes DROP CONSTRAINT IF EXISTS episodes_owner_check;
ALTER TABLE public.episodes ADD CONSTRAINT episodes_owner_check CHECK ((podcast_id IS NOT NULL)::int + (show_id IS NOT NULL)::int = 1);
