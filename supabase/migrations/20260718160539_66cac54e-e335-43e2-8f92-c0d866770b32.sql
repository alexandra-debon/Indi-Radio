ALTER TABLE public.content_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.content_comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS content_comments_parent_id_idx ON public.content_comments(parent_id);