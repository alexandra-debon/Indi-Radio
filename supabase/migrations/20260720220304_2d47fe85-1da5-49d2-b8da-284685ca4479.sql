
CREATE OR REPLACE FUNCTION public.trg_prewarm_translation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_entity_type text := COALESCE(TG_ARGV[0], TG_TABLE_NAME);
  v_key_col text := COALESCE(TG_ARGV[1], 'id');
  v_row jsonb := to_jsonb(NEW);
  v_old jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  v_key text := v_row->>v_key_col;
  v_items jsonb := '[]'::jsonb;
  v_field text;
  v_text text;
  v_prev text;
  i int;
  v_len int := COALESCE(array_length(TG_ARGV, 1), 0);
BEGIN
  IF v_key IS NULL OR v_len < 3 THEN RETURN NEW; END IF;
  FOR i IN 2..(v_len - 1) LOOP
    v_field := TG_ARGV[i];
    v_text := v_row->>v_field;
    v_prev := v_old->>v_field;
    IF v_text IS NOT NULL AND length(btrim(v_text)) >= 2
       AND (TG_OP = 'INSERT' OR v_text IS DISTINCT FROM v_prev) THEN
      v_items := v_items || jsonb_build_object(
        'entityType', v_entity_type,
        'entityKey', v_key,
        'field', v_field,
        'text', v_text
      );
    END IF;
  END LOOP;
  IF jsonb_array_length(v_items) = 0 THEN RETURN NEW; END IF;
  PERFORM extensions.http_post(
    url := 'https://radio.indi-art-culture.com/api/public/prewarm-translation',
    body := jsonb_build_object('items', v_items),
    headers := jsonb_build_object('Content-Type','application/json')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.trg_prewarm_translation() FROM PUBLIC;

-- posts
DROP TRIGGER IF EXISTS prewarm_translation_posts ON public.posts;
CREATE TRIGGER prewarm_translation_posts
AFTER INSERT OR UPDATE OF title, content ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('post', 'id', 'title', 'content');

-- post_comments
DROP TRIGGER IF EXISTS prewarm_translation_post_comments ON public.post_comments;
CREATE TRIGGER prewarm_translation_post_comments
AFTER INSERT OR UPDATE OF content ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('post_comment', 'id', 'content');

-- news_posts
DROP TRIGGER IF EXISTS prewarm_translation_news_posts ON public.news_posts;
CREATE TRIGGER prewarm_translation_news_posts
AFTER INSERT OR UPDATE OF title, content ON public.news_posts
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('news_post', 'id', 'title', 'content');

-- news_comments
DROP TRIGGER IF EXISTS prewarm_translation_news_comments ON public.news_comments;
CREATE TRIGGER prewarm_translation_news_comments
AFTER INSERT OR UPDATE OF content ON public.news_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('news_comment', 'id', 'content');

-- content_comments
DROP TRIGGER IF EXISTS prewarm_translation_content_comments ON public.content_comments;
CREATE TRIGGER prewarm_translation_content_comments
AFTER INSERT OR UPDATE OF body ON public.content_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('content_comment', 'id', 'body');

-- album_reviews
DROP TRIGGER IF EXISTS prewarm_translation_album_reviews ON public.album_reviews;
CREATE TRIGGER prewarm_translation_album_reviews
AFTER INSERT OR UPDATE OF title, excerpt ON public.album_reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('album_review', 'id', 'title', 'excerpt');

-- photo_albums
DROP TRIGGER IF EXISTS prewarm_translation_photo_albums ON public.photo_albums;
CREATE TRIGGER prewarm_translation_photo_albums
AFTER INSERT OR UPDATE OF title, description ON public.photo_albums
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('photo_album', 'id', 'title', 'description');

-- podcasts
DROP TRIGGER IF EXISTS prewarm_translation_podcasts ON public.podcasts;
CREATE TRIGGER prewarm_translation_podcasts
AFTER INSERT OR UPDATE OF title, description ON public.podcasts
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('podcast', 'id', 'title', 'description');

-- shows
DROP TRIGGER IF EXISTS prewarm_translation_shows ON public.shows;
CREATE TRIGGER prewarm_translation_shows
AFTER INSERT OR UPDATE OF title, description ON public.shows
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('show', 'id', 'title', 'description');

-- magazine_entries
DROP TRIGGER IF EXISTS prewarm_translation_magazine_entries ON public.magazine_entries;
CREATE TRIGGER prewarm_translation_magazine_entries
AFTER INSERT OR UPDATE OF title, body ON public.magazine_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('magazine_entry', 'id', 'title', 'body');

-- clip_entries
DROP TRIGGER IF EXISTS prewarm_translation_clip_entries ON public.clip_entries;
CREATE TRIGGER prewarm_translation_clip_entries
AFTER INSERT OR UPDATE OF title, body ON public.clip_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('clip_entry', 'id', 'title', 'body');

-- profiles.bio
DROP TRIGGER IF EXISTS prewarm_translation_profiles ON public.profiles;
CREATE TRIGGER prewarm_translation_profiles
AFTER INSERT OR UPDATE OF bio ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_prewarm_translation('profile', 'id', 'bio');
