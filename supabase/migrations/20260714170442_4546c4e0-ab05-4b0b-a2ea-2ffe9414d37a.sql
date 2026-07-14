CREATE OR REPLACE FUNCTION public.trg_notify_post_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_post_author uuid;
  v_actor_pseudo text;
  v_url text;
BEGIN
  SELECT author_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.author_id;
  v_url := '/#post-' || NEW.post_id::text || '|c-' || NEW.id::text;

  IF v_post_author IS NOT NULL AND v_post_author <> NEW.author_id
     AND public.notif_pref_enabled(v_post_author, 'replies') THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
    VALUES (v_post_author, NEW.author_id, 'reply',
      COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a répondu à ton message',
      v_url);
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  SELECT DISTINCT c.author_id, NEW.author_id, 'reply',
    COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a répondu dans un fil que tu suis',
    v_url
  FROM public.post_comments c
  WHERE c.post_id = NEW.post_id
    AND c.author_id <> NEW.author_id
    AND c.author_id <> COALESCE(v_post_author, '00000000-0000-0000-0000-000000000000'::uuid)
    AND public.notif_pref_enabled(c.author_id, 'thread_replies');
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_notify_news_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_post_author uuid;
  v_post_title text;
  v_actor_pseudo text;
  v_url text;
BEGIN
  SELECT author_id, title INTO v_post_author, v_post_title FROM public.news_posts WHERE id = NEW.news_post_id;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.author_id;
  v_url := '/actus#news-' || NEW.news_post_id::text || '|c-' || NEW.id::text;

  IF v_post_author IS NOT NULL AND v_post_author <> NEW.author_id
     AND public.notif_pref_enabled(v_post_author, 'replies') THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
    VALUES (v_post_author, NEW.author_id, 'reply',
      COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a commenté ta publication « ' || COALESCE(v_post_title, '') || ' »',
      v_url);
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  SELECT DISTINCT c.author_id, NEW.author_id, 'reply',
    COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a répondu dans un fil que tu suis',
    v_url
  FROM public.news_comments c
  WHERE c.news_post_id = NEW.news_post_id
    AND c.author_id <> NEW.author_id
    AND c.author_id <> COALESCE(v_post_author, '00000000-0000-0000-0000-000000000000'::uuid)
    AND public.notif_pref_enabled(c.author_id, 'thread_replies');
  RETURN NEW;
END; $function$;