CREATE OR REPLACE FUNCTION public.trg_notify_content_comment_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_author uuid;
  v_actor_pseudo text;
  v_url text;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT author_id INTO v_parent_author FROM public.content_comments WHERE id = NEW.parent_id;
  IF v_parent_author IS NULL OR v_parent_author = NEW.author_id THEN RETURN NEW; END IF;
  IF NOT public.notif_pref_enabled(v_parent_author, 'thread_replies') THEN RETURN NEW; END IF;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.author_id;
  v_url := CASE WHEN NEW.content_type = 'top' THEN '/top' ELSE '/' END;
  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  VALUES (v_parent_author, NEW.author_id, 'reply',
    COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a répondu à ton commentaire',
    v_url);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_content_comment_reply ON public.content_comments;
CREATE TRIGGER trg_notify_content_comment_reply
AFTER INSERT ON public.content_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_content_comment_reply();