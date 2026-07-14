
-- Attach missing notification triggers
DROP TRIGGER IF EXISTS trg_notify_wall_mentions_ins ON public.posts;
CREATE TRIGGER trg_notify_wall_mentions_ins
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_wall_mentions();

DROP TRIGGER IF EXISTS trg_notify_post_comment_ins ON public.post_comments;
CREATE TRIGGER trg_notify_post_comment_ins
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_post_comment();

DROP TRIGGER IF EXISTS trg_notify_news_comment_ins ON public.news_comments;
CREATE TRIGGER trg_notify_news_comment_ins
AFTER INSERT ON public.news_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_news_comment();

-- Also existing point triggers
DROP TRIGGER IF EXISTS trg_points_on_comment_ins ON public.post_comments;
CREATE TRIGGER trg_points_on_comment_ins
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_comment();

DROP TRIGGER IF EXISTS trg_points_on_post_ins ON public.posts;
CREATE TRIGGER trg_points_on_post_ins
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_post();

DROP TRIGGER IF EXISTS trg_points_on_post_like_ins ON public.post_likes;
CREATE TRIGGER trg_points_on_post_like_ins
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_post_like();

DROP TRIGGER IF EXISTS trg_points_on_news_like_ins ON public.news_likes;
CREATE TRIGGER trg_points_on_news_like_ins
AFTER INSERT ON public.news_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_news_like();

-- New: notify on like of a post (wall message)
CREATE OR REPLACE FUNCTION public.trg_notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_author uuid;
  v_actor_pseudo text;
BEGIN
  SELECT author_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN
    RETURN NEW;
  END IF;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  VALUES (v_author, NEW.user_id, 'like',
    COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a aimé ton message',
    '/#post-' || NEW.post_id::text);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_post_like_ins ON public.post_likes;
CREATE TRIGGER trg_notify_post_like_ins
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_post_like();

-- New: notify on like of a news post
CREATE OR REPLACE FUNCTION public.trg_notify_news_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_author uuid;
  v_title text;
  v_actor_pseudo text;
BEGIN
  SELECT author_id, title INTO v_author, v_title FROM public.news_posts WHERE id = NEW.news_post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN
    RETURN NEW;
  END IF;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  VALUES (v_author, NEW.user_id, 'like',
    COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a aimé ta publication « ' || COALESCE(v_title, '') || ' »',
    '/actus#news-' || NEW.news_post_id::text);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_news_like_ins ON public.news_likes;
CREATE TRIGGER trg_notify_news_like_ins
AFTER INSERT ON public.news_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_news_like();
