
-- Helper: notifies only mentions present in new_text but not in old_text
CREATE OR REPLACE FUNCTION public.notify_new_mentions_from_text(
  _actor_id uuid, _old_text text, _new_text text, _url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_tokens text[];
  v_old_tokens text[];
  v_delta text := '';
  v_tok text;
BEGIN
  IF _new_text IS NULL OR length(_new_text) = 0 THEN RETURN; END IF;

  SELECT COALESCE(array_agg(DISTINCT lower(m[1])), '{}')
    INTO v_new_tokens
    FROM regexp_matches(COALESCE(_new_text,''), '@([[:alnum:]_.\-]+)', 'g') AS m;

  SELECT COALESCE(array_agg(DISTINCT lower(m[1])), '{}')
    INTO v_old_tokens
    FROM regexp_matches(COALESCE(_old_text,''), '@([[:alnum:]_.\-]+)', 'g') AS m;

  FOREACH v_tok IN ARRAY v_new_tokens LOOP
    IF NOT (v_tok = ANY(v_old_tokens)) THEN
      v_delta := v_delta || ' @' || v_tok;
    END IF;
  END LOOP;

  IF length(v_delta) > 0 THEN
    PERFORM public.notify_mentions_from_text(_actor_id, v_delta, _url);
  END IF;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_new_mentions_from_text(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- Extend wall trigger: cover title + content + image captions on INSERT
CREATE OR REPLACE FUNCTION public.trg_notify_wall_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_full text;
BEGIN
  v_full := COALESCE(NEW.title,'') || E'\n'
         || COALESCE(NEW.content,'') || E'\n'
         || COALESCE(array_to_string(NEW.image_captions, E'\n'), '');
  PERFORM public.notify_mentions_from_text(NEW.author_id, v_full, '/#post-' || NEW.id::text);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_wall_mentions() FROM PUBLIC, anon, authenticated;

-- New trigger for UPDATE on posts: only newly-added mentions in title/content/captions
CREATE OR REPLACE FUNCTION public.trg_notify_wall_mentions_upd()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old text; v_new text;
BEGIN
  v_old := COALESCE(OLD.title,'') || E'\n'
        || COALESCE(OLD.content,'') || E'\n'
        || COALESCE(array_to_string(OLD.image_captions, E'\n'), '');
  v_new := COALESCE(NEW.title,'') || E'\n'
        || COALESCE(NEW.content,'') || E'\n'
        || COALESCE(array_to_string(NEW.image_captions, E'\n'), '');
  IF v_new IS DISTINCT FROM v_old THEN
    PERFORM public.notify_new_mentions_from_text(NEW.author_id, v_old, v_new, '/#post-' || NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_wall_mentions_upd() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_wall_mentions_upd ON public.posts;
CREATE TRIGGER trg_notify_wall_mentions_upd
AFTER UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_wall_mentions_upd();

-- Photo album mentions in title/description
CREATE OR REPLACE FUNCTION public.trg_notify_album_mentions_ins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pseudo text; v_url text; v_full text;
BEGIN
  SELECT pseudo INTO v_pseudo FROM public.profiles WHERE id = NEW.owner_id;
  v_url := '/u/' || COALESCE(v_pseudo, '') || '/albums/' || NEW.id::text;
  v_full := COALESCE(NEW.title,'') || E'\n' || COALESCE(NEW.description,'');
  PERFORM public.notify_mentions_from_text(NEW.owner_id, v_full, v_url);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_album_mentions_ins() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_notify_album_mentions_upd()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pseudo text; v_url text; v_old text; v_new text;
BEGIN
  v_old := COALESCE(OLD.title,'') || E'\n' || COALESCE(OLD.description,'');
  v_new := COALESCE(NEW.title,'') || E'\n' || COALESCE(NEW.description,'');
  IF v_new IS DISTINCT FROM v_old THEN
    SELECT pseudo INTO v_pseudo FROM public.profiles WHERE id = NEW.owner_id;
    v_url := '/u/' || COALESCE(v_pseudo, '') || '/albums/' || NEW.id::text;
    PERFORM public.notify_new_mentions_from_text(NEW.owner_id, v_old, v_new, v_url);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_album_mentions_upd() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_album_mentions_ins ON public.photo_albums;
CREATE TRIGGER trg_notify_album_mentions_ins
AFTER INSERT ON public.photo_albums
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_album_mentions_ins();

DROP TRIGGER IF EXISTS trg_notify_album_mentions_upd ON public.photo_albums;
CREATE TRIGGER trg_notify_album_mentions_upd
AFTER UPDATE ON public.photo_albums
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_album_mentions_upd();
