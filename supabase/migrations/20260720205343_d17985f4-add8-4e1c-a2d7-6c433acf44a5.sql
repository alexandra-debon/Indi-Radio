
-- Extend @mention notifications to comments (content_comments body), dedicaces (requests), and ratings.

-- Fix content_comments trigger to use the correct column (body, not content) and include edits.
CREATE OR REPLACE FUNCTION public.trg_notify_content_comment_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url text;
BEGIN
  v_url := CASE WHEN NEW.content_type = 'top' THEN '/top' ELSE '/' END;
  PERFORM public.notify_mentions_from_text(NEW.author_id, NEW.body, v_url);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_content_comment_mentions() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_content_comment_mentions_ins ON public.content_comments;
CREATE TRIGGER trg_notify_content_comment_mentions_ins
AFTER INSERT ON public.content_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_content_comment_mentions();

CREATE OR REPLACE FUNCTION public.trg_notify_content_comment_mentions_upd()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url text;
BEGIN
  IF COALESCE(NEW.body,'') = COALESCE(OLD.body,'') THEN RETURN NEW; END IF;
  v_url := CASE WHEN NEW.content_type = 'top' THEN '/top' ELSE '/' END;
  PERFORM public.notify_new_mentions_from_text(NEW.author_id, OLD.body, NEW.body, v_url);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_content_comment_mentions_upd() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_content_comment_mentions_upd ON public.content_comments;
CREATE TRIGGER trg_notify_content_comment_mentions_upd
AFTER UPDATE OF body ON public.content_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_content_comment_mentions_upd();

-- Requests (dédicaces) — track_requested + dedication_message
CREATE OR REPLACE FUNCTION public.trg_notify_request_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_mentions_from_text(
    NEW.author_id,
    COALESCE(NEW.track_requested, '') || E'\n' || COALESCE(NEW.dedication_message, ''),
    '/en-direct'
  );
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_request_mentions() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_request_mentions_ins ON public.requests;
CREATE TRIGGER trg_notify_request_mentions_ins
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_request_mentions();

-- Episode ratings (notes d'épisodes de podcast) — comment field
CREATE OR REPLACE FUNCTION public.trg_notify_episode_rating_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.comment IS NULL OR length(btrim(NEW.comment)) = 0 THEN RETURN NEW; END IF;
  PERFORM public.notify_mentions_from_text(NEW.user_id, NEW.comment, '/');
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_episode_rating_mentions() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_episode_rating_mentions_ins ON public.episode_ratings;
CREATE TRIGGER trg_notify_episode_rating_mentions_ins
AFTER INSERT ON public.episode_ratings
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_episode_rating_mentions();

CREATE OR REPLACE FUNCTION public.trg_notify_episode_rating_mentions_upd()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.comment,'') = COALESCE(OLD.comment,'') THEN RETURN NEW; END IF;
  PERFORM public.notify_new_mentions_from_text(NEW.user_id, COALESCE(OLD.comment,''), COALESCE(NEW.comment,''), '/');
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_episode_rating_mentions_upd() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_episode_rating_mentions_upd ON public.episode_ratings;
CREATE TRIGGER trg_notify_episode_rating_mentions_upd
AFTER UPDATE OF comment ON public.episode_ratings
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_episode_rating_mentions_upd();

-- Content ratings (notes générales sur podcasts / émissions / chroniques) — comment field
CREATE OR REPLACE FUNCTION public.trg_notify_content_rating_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url text;
BEGIN
  IF NEW.comment IS NULL OR length(btrim(NEW.comment)) = 0 THEN RETURN NEW; END IF;
  v_url := CASE WHEN NEW.content_type = 'top' THEN '/top' ELSE '/' END;
  PERFORM public.notify_mentions_from_text(NEW.user_id, NEW.comment, v_url);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_content_rating_mentions() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_content_rating_mentions_ins ON public.content_ratings;
CREATE TRIGGER trg_notify_content_rating_mentions_ins
AFTER INSERT ON public.content_ratings
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_content_rating_mentions();

CREATE OR REPLACE FUNCTION public.trg_notify_content_rating_mentions_upd()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url text;
BEGIN
  IF COALESCE(NEW.comment,'') = COALESCE(OLD.comment,'') THEN RETURN NEW; END IF;
  v_url := CASE WHEN NEW.content_type = 'top' THEN '/top' ELSE '/' END;
  PERFORM public.notify_new_mentions_from_text(NEW.user_id, COALESCE(OLD.comment,''), COALESCE(NEW.comment,''), v_url);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_content_rating_mentions_upd() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_content_rating_mentions_upd ON public.content_ratings;
CREATE TRIGGER trg_notify_content_rating_mentions_upd
AFTER UPDATE OF comment ON public.content_ratings
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_content_rating_mentions_upd();
