
-- Shared helper: parse @tokens from free text and dispatch notifications.
-- Group tokens (allartists / allfans / allindi) are admin-only.
CREATE OR REPLACE FUNCTION public.notify_mentions_from_text(
  _actor_id uuid,
  _content text,
  _url text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_pseudo text;
  v_is_admin boolean;
  v_token text;
  v_lower text;
  v_recipient uuid;
  v_group_message text;
BEGIN
  IF _content IS NULL OR length(_content) = 0 THEN RETURN; END IF;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = _actor_id;
  v_is_admin := public.has_role(_actor_id, 'admin');

  FOR v_token IN
    SELECT DISTINCT m[1]
    FROM regexp_matches(_content, '@([[:alnum:]_.\-]+)', 'g') AS m
  LOOP
    v_lower := lower(v_token);

    IF v_lower IN ('allartists','allfans','allindi') THEN
      IF NOT v_is_admin THEN CONTINUE; END IF;

      v_group_message := CASE v_lower
        WHEN 'allartists' THEN COALESCE(v_actor_pseudo, 'Un admin') || ' s''adresse à tous les artistes'
        WHEN 'allfans'    THEN COALESCE(v_actor_pseudo, 'Un admin') || ' s''adresse à tous les auditeurs'
        ELSE                    COALESCE(v_actor_pseudo, 'Un admin') || ' s''adresse à toute la communauté Indi'
      END;

      INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
      SELECT p.id, _actor_id, 'mention', v_group_message, _url
      FROM public.profiles p
      WHERE p.id <> _actor_id
        AND p.quarantined_at IS NULL
        AND (
          v_lower = 'allindi'
          OR (v_lower = 'allartists' AND p.role = 'artiste')
          OR (v_lower = 'allfans' AND p.role = 'auditeur')
        )
        AND public.notif_pref_enabled(p.id, 'mentions');
    ELSE
      SELECT id INTO v_recipient FROM public.profiles WHERE lower(pseudo) = v_lower LIMIT 1;
      IF v_recipient IS NOT NULL AND v_recipient <> _actor_id
         AND public.notif_pref_enabled(v_recipient, 'mentions') THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
        VALUES (v_recipient, _actor_id, 'mention',
          COALESCE(v_actor_pseudo, 'Quelqu''un') || ' t''a tagué dans un message',
          _url);
      END IF;
    END IF;
  END LOOP;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_mentions_from_text(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- Rewire wall (posts) trigger to use the helper so groups work there too.
CREATE OR REPLACE FUNCTION public.trg_notify_wall_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_mentions_from_text(NEW.author_id, NEW.content, '/#post-' || NEW.id::text);
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.trg_notify_wall_mentions() FROM PUBLIC, anon, authenticated;

-- Post comments
CREATE OR REPLACE FUNCTION public.trg_notify_post_comment_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_mentions_from_text(
    NEW.author_id,
    NEW.content,
    '/#post-' || NEW.post_id::text || '|c-' || NEW.id::text
  );
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_post_comment_mentions() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_post_comment_mentions_ins ON public.post_comments;
CREATE TRIGGER trg_notify_post_comment_mentions_ins
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_post_comment_mentions();

-- News posts (admin publications)
CREATE OR REPLACE FUNCTION public.trg_notify_news_post_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_mentions_from_text(
    NEW.author_id,
    COALESCE(NEW.title, '') || E'\n' || COALESCE(NEW.content, ''),
    '/actus#news-' || NEW.id::text
  );
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_news_post_mentions() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_news_post_mentions_ins ON public.news_posts;
CREATE TRIGGER trg_notify_news_post_mentions_ins
AFTER INSERT ON public.news_posts
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_news_post_mentions();

-- News comments
CREATE OR REPLACE FUNCTION public.trg_notify_news_comment_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_mentions_from_text(
    NEW.author_id,
    NEW.content,
    '/actus#news-' || NEW.news_post_id::text || '|c-' || NEW.id::text
  );
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_news_comment_mentions() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_news_comment_mentions_ins ON public.news_comments;
CREATE TRIGGER trg_notify_news_comment_mentions_ins
AFTER INSERT ON public.news_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_news_comment_mentions();

-- Content comments (podcasts / shows / reviews / top / etc.)
CREATE OR REPLACE FUNCTION public.trg_notify_content_comment_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url text;
BEGIN
  v_url := CASE WHEN NEW.content_type = 'top' THEN '/top' ELSE '/' END;
  PERFORM public.notify_mentions_from_text(NEW.author_id, NEW.content, v_url);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_notify_content_comment_mentions() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_content_comment_mentions_ins ON public.content_comments;
CREATE TRIGGER trg_notify_content_comment_mentions_ins
AFTER INSERT ON public.content_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_content_comment_mentions();
