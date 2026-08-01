
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_search_engines(_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _path IS NULL OR _path = '' THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://radio.indi-art-culture.com/api/public/hooks/indexnow',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('paths', jsonb_build_array(_path))
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'IndexNow ping failed for %: %', _path, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_search_engines(text) FROM PUBLIC;

-- Chroniques (publiées uniquement)
CREATE OR REPLACE FUNCTION public.trg_indexnow_album_reviews()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.published IS TRUE AND (TG_OP = 'INSERT' OR OLD.published IS DISTINCT FROM TRUE) THEN
    PERFORM public.notify_search_engines('/chroniques/' || NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS indexnow_album_reviews ON public.album_reviews;
CREATE TRIGGER indexnow_album_reviews
AFTER INSERT OR UPDATE ON public.album_reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_indexnow_album_reviews();

-- Actus
CREATE OR REPLACE FUNCTION public.trg_indexnow_news_posts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_search_engines('/actus/' || NEW.id::text);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS indexnow_news_posts ON public.news_posts;
CREATE TRIGGER indexnow_news_posts
AFTER INSERT ON public.news_posts
FOR EACH ROW EXECUTE FUNCTION public.trg_indexnow_news_posts();

-- Émissions
CREATE OR REPLACE FUNCTION public.trg_indexnow_shows()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_search_engines('/emissions/' || NEW.id::text);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS indexnow_shows ON public.shows;
CREATE TRIGGER indexnow_shows
AFTER INSERT ON public.shows
FOR EACH ROW EXECUTE FUNCTION public.trg_indexnow_shows();

-- Épisodes (dès qu'ils ont une date de publication)
CREATE OR REPLACE FUNCTION public.trg_indexnow_episodes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.published_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.published_at IS DISTINCT FROM NEW.published_at) THEN
    PERFORM public.notify_search_engines('/episodes/' || NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS indexnow_episodes ON public.episodes;
CREATE TRIGGER indexnow_episodes
AFTER INSERT OR UPDATE ON public.episodes
FOR EACH ROW EXECUTE FUNCTION public.trg_indexnow_episodes();

-- Magazines
CREATE OR REPLACE FUNCTION public.trg_indexnow_magazine_entries()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_search_engines('/magazines/' || NEW.id::text);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS indexnow_magazine_entries ON public.magazine_entries;
CREATE TRIGGER indexnow_magazine_entries
AFTER INSERT ON public.magazine_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_indexnow_magazine_entries();

-- Clips
CREATE OR REPLACE FUNCTION public.trg_indexnow_clip_entries()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_search_engines('/clips/' || NEW.id::text);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS indexnow_clip_entries ON public.clip_entries;
CREATE TRIGGER indexnow_clip_entries
AFTER INSERT ON public.clip_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_indexnow_clip_entries();
