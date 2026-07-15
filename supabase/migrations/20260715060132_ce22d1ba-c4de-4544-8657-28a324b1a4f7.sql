CREATE TYPE public.clip_section AS ENUM ('clips_actu', 'playlists_clips');

CREATE TABLE public.clip_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section public.clip_section NOT NULL,
  title text NOT NULL,
  body text,
  video_url text,
  playlist_url text,
  video_urls text[],
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pinned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.clip_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clip_entries TO authenticated;
GRANT ALL ON public.clip_entries TO service_role;

ALTER TABLE public.clip_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clip_entries_select_public"
  ON public.clip_entries FOR SELECT
  USING (true);

CREATE POLICY "clip_entries_admin_insert"
  ON public.clip_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "clip_entries_admin_update"
  ON public.clip_entries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "clip_entries_admin_delete"
  ON public.clip_entries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_clip_entries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clip_entries_updated_at
  BEFORE UPDATE ON public.clip_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_clip_entries_updated_at();

CREATE INDEX clip_entries_section_created_idx
  ON public.clip_entries (section, pinned_at DESC NULLS LAST, created_at DESC);