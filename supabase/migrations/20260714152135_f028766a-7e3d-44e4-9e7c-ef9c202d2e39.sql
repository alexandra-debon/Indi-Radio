
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  message text NOT NULL,
  url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = recipient_id);

CREATE INDEX notifications_recipient_idx ON public.notifications (recipient_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify mentioned users on wall posts
CREATE OR REPLACE FUNCTION public.trg_notify_wall_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pseudo text;
  v_recipient uuid;
  v_actor_pseudo text;
BEGIN
  IF NEW.mentions IS NULL OR array_length(NEW.mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.author_id;
  FOREACH v_pseudo IN ARRAY NEW.mentions LOOP
    SELECT id INTO v_recipient FROM public.profiles WHERE lower(pseudo) = lower(v_pseudo) LIMIT 1;
    IF v_recipient IS NOT NULL AND v_recipient <> NEW.author_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
      VALUES (
        v_recipient,
        NEW.author_id,
        'mention',
        COALESCE(v_actor_pseudo, 'Quelqu''un') || ' t''a tagué dans un message',
        '/#post-' || NEW.id::text
      );
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER posts_notify_mentions
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_wall_mentions();

-- Trigger: notify news post author when someone comments
CREATE OR REPLACE FUNCTION public.trg_notify_news_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author uuid;
  v_post_title text;
  v_actor_pseudo text;
BEGIN
  SELECT author_id, title INTO v_post_author, v_post_title
  FROM public.news_posts WHERE id = NEW.news_post_id;

  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.author_id;

  IF v_post_author IS NOT NULL AND v_post_author <> NEW.author_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
    VALUES (
      v_post_author,
      NEW.author_id,
      'reply',
      COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a commenté ta publication « ' || COALESCE(v_post_title, '') || ' »',
      '/actus#news-' || NEW.news_post_id::text
    );
  END IF;

  -- Also notify other commenters (thread reply)
  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  SELECT DISTINCT c.author_id, NEW.author_id, 'reply',
         COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a répondu dans un fil que tu suis',
         '/actus#news-' || NEW.news_post_id::text
  FROM public.news_comments c
  WHERE c.news_post_id = NEW.news_post_id
    AND c.author_id <> NEW.author_id
    AND c.author_id <> COALESCE(v_post_author, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END; $$;

CREATE TRIGGER news_comments_notify
AFTER INSERT ON public.news_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_news_comment();

REVOKE EXECUTE ON FUNCTION public.trg_notify_wall_mentions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notify_news_comment() FROM PUBLIC, anon, authenticated;
