CREATE OR REPLACE FUNCTION public.notify_search_engines_paths(_paths text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_clean text[];
BEGIN
  SELECT COALESCE(array_agg(DISTINCT p), '{}')
    INTO v_clean
    FROM unnest(COALESCE(_paths, '{}')) AS p
   WHERE p IS NOT NULL AND btrim(p) <> '' AND left(btrim(p), 1) = '/';

  IF array_length(v_clean, 1) IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://radio.indi-art-culture.com/api/public/hooks/indexnow',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('paths', to_jsonb(v_clean))
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'IndexNow batch ping failed: %', SQLERRM;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_search_engines_paths(text[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_indexnow_playlist_slug_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    PERFORM public.notify_search_engines_paths(ARRAY[
      '/playlists',
      CASE WHEN OLD.slug IS NOT NULL AND OLD.slug <> '' THEN '/playlists/' || OLD.slug END,
      CASE WHEN NEW.slug IS NOT NULL AND NEW.slug <> '' AND NEW.is_published THEN '/playlists/' || NEW.slug END
    ]);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_indexnow_playlist_slug_change ON public.playlist_entries;
CREATE TRIGGER trg_indexnow_playlist_slug_change
AFTER UPDATE OF slug ON public.playlist_entries
FOR EACH ROW
WHEN (OLD.slug IS DISTINCT FROM NEW.slug)
EXECUTE FUNCTION public.trg_indexnow_playlist_slug_change();

CREATE OR REPLACE FUNCTION public.trg_indexnow_playlist_entries()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_published THEN
    -- Un changement de slug est déjà signalé par trg_indexnow_playlist_slug_change
    IF TG_OP = 'UPDATE' AND OLD.slug IS DISTINCT FROM NEW.slug THEN
      RETURN NEW;
    END IF;
    IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
      PERFORM public.notify_search_engines_paths(ARRAY['/playlists', '/playlists/' || NEW.slug]);
    ELSE
      PERFORM public.notify_search_engines('/playlists');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;