
-- Preferences table
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mentions boolean NOT NULL DEFAULT true,
  replies boolean NOT NULL DEFAULT true,
  thread_replies boolean NOT NULL DEFAULT true,
  likes boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notif prefs"
  ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.touch_notif_prefs_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_touch_notif_prefs
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.touch_notif_prefs_updated_at();

-- Helper: returns true when the recipient allows the given kind (default true if no row)
CREATE OR REPLACE FUNCTION public.notif_pref_enabled(_user_id uuid, _kind text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _kind
    WHEN 'mentions'       THEN COALESCE((SELECT mentions       FROM public.notification_preferences WHERE user_id = _user_id), true)
    WHEN 'replies'        THEN COALESCE((SELECT replies        FROM public.notification_preferences WHERE user_id = _user_id), true)
    WHEN 'thread_replies' THEN COALESCE((SELECT thread_replies FROM public.notification_preferences WHERE user_id = _user_id), true)
    WHEN 'likes'          THEN COALESCE((SELECT likes          FROM public.notification_preferences WHERE user_id = _user_id), true)
    ELSE true
  END;
$$;

-- Rewrite triggers to honour preferences
CREATE OR REPLACE FUNCTION public.trg_notify_wall_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pseudo text;
  v_recipient uuid;
  v_actor_pseudo text;
BEGIN
  IF NEW.mentions IS NULL OR array_length(NEW.mentions, 1) IS NULL THEN RETURN NEW; END IF;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.author_id;
  FOREACH v_pseudo IN ARRAY NEW.mentions LOOP
    SELECT id INTO v_recipient FROM public.profiles WHERE lower(pseudo) = lower(v_pseudo) LIMIT 1;
    IF v_recipient IS NOT NULL AND v_recipient <> NEW.author_id
       AND public.notif_pref_enabled(v_recipient, 'mentions') THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
      VALUES (v_recipient, NEW.author_id, 'mention',
        COALESCE(v_actor_pseudo, 'Quelqu''un') || ' t''a tagué dans un message',
        '/#post-' || NEW.id::text);
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_notify_post_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post_author uuid;
  v_actor_pseudo text;
BEGIN
  SELECT author_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.author_id;

  IF v_post_author IS NOT NULL AND v_post_author <> NEW.author_id
     AND public.notif_pref_enabled(v_post_author, 'replies') THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
    VALUES (v_post_author, NEW.author_id, 'reply',
      COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a répondu à ton message',
      '/#post-' || NEW.post_id::text);
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  SELECT DISTINCT c.author_id, NEW.author_id, 'reply',
    COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a répondu dans un fil que tu suis',
    '/#post-' || NEW.post_id::text
  FROM public.post_comments c
  WHERE c.post_id = NEW.post_id
    AND c.author_id <> NEW.author_id
    AND c.author_id <> COALESCE(v_post_author, '00000000-0000-0000-0000-000000000000'::uuid)
    AND public.notif_pref_enabled(c.author_id, 'thread_replies');
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_notify_news_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post_author uuid;
  v_post_title text;
  v_actor_pseudo text;
BEGIN
  SELECT author_id, title INTO v_post_author, v_post_title FROM public.news_posts WHERE id = NEW.news_post_id;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.author_id;

  IF v_post_author IS NOT NULL AND v_post_author <> NEW.author_id
     AND public.notif_pref_enabled(v_post_author, 'replies') THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
    VALUES (v_post_author, NEW.author_id, 'reply',
      COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a commenté ta publication « ' || COALESCE(v_post_title, '') || ' »',
      '/actus#news-' || NEW.news_post_id::text);
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  SELECT DISTINCT c.author_id, NEW.author_id, 'reply',
    COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a répondu dans un fil que tu suis',
    '/actus#news-' || NEW.news_post_id::text
  FROM public.news_comments c
  WHERE c.news_post_id = NEW.news_post_id
    AND c.author_id <> NEW.author_id
    AND c.author_id <> COALESCE(v_post_author, '00000000-0000-0000-0000-000000000000'::uuid)
    AND public.notif_pref_enabled(c.author_id, 'thread_replies');
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_notify_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_actor_pseudo text;
BEGIN
  SELECT author_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  IF NOT public.notif_pref_enabled(v_author, 'likes') THEN RETURN NEW; END IF;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  VALUES (v_author, NEW.user_id, 'like',
    COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a aimé ton message',
    '/#post-' || NEW.post_id::text);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_notify_news_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author uuid;
  v_title text;
  v_actor_pseudo text;
BEGIN
  SELECT author_id, title INTO v_author, v_title FROM public.news_posts WHERE id = NEW.news_post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  IF NOT public.notif_pref_enabled(v_author, 'likes') THEN RETURN NEW; END IF;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  VALUES (v_author, NEW.user_id, 'like',
    COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a aimé ta publication « ' || COALESCE(v_title, '') || ' »',
    '/actus#news-' || NEW.news_post_id::text);
  RETURN NEW;
END; $$;
