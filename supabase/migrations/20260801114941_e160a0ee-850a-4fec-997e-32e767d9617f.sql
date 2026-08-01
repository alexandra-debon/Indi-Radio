CREATE TABLE public.playlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'thematique',
  year integer,
  spotify_embed text,
  apple_embed text,
  position integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.playlist_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_entries TO authenticated;
GRANT ALL ON public.playlist_entries TO service_role;

ALTER TABLE public.playlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published playlists are viewable by everyone"
  ON public.playlist_entries FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert playlists"
  ON public.playlist_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update playlists"
  ON public.playlist_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete playlists"
  ON public.playlist_entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_playlist_entries_updated_at
  BEFORE UPDATE ON public.playlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE OR REPLACE FUNCTION public.trg_indexnow_playlist_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_published THEN
    PERFORM public.notify_search_engines('/playlists');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_playlist_entries_indexnow
  AFTER INSERT OR UPDATE ON public.playlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_indexnow_playlist_entries();