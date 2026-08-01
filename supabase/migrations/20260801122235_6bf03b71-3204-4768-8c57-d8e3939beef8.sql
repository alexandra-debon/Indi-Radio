CREATE OR REPLACE FUNCTION public.trg_indexnow_playlist_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published THEN
    PERFORM public.notify_search_engines('/playlists');
    IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
      PERFORM public.notify_search_engines('/playlists/' || NEW.slug);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;