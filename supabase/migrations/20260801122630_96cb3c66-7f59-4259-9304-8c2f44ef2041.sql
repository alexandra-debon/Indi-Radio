CREATE TABLE public.playlist_slug_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlist_entries(id) ON DELETE CASCADE,
  old_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX playlist_slug_history_old_slug_key ON public.playlist_slug_history (old_slug);

GRANT SELECT ON public.playlist_slug_history TO anon;
GRANT SELECT ON public.playlist_slug_history TO authenticated;
GRANT ALL ON public.playlist_slug_history TO service_role;

ALTER TABLE public.playlist_slug_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Slug history is publicly readable"
  ON public.playlist_slug_history FOR SELECT
  USING (true);

CREATE POLICY "Admins manage slug history"
  ON public.playlist_slug_history FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.trg_playlist_slug_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug AND OLD.slug IS NOT NULL AND OLD.slug <> '' THEN
    DELETE FROM public.playlist_slug_history WHERE old_slug = NEW.slug;
    INSERT INTO public.playlist_slug_history (playlist_id, old_slug)
    VALUES (OLD.id, OLD.slug)
    ON CONFLICT (old_slug) DO UPDATE SET playlist_id = EXCLUDED.playlist_id, created_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_playlist_entries_slug_history
AFTER UPDATE OF slug ON public.playlist_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_playlist_slug_history();