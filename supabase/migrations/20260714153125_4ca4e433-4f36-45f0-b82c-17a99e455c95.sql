
-- Likes on wall posts
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT SELECT ON public.post_likes TO anon;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_likes read all" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes insert own" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes delete own" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Comments (replies) on wall posts
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT SELECT ON public.post_comments TO anon;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_comments read all" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "post_comments insert own" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "post_comments update own" ON public.post_comments FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "post_comments delete own or admin" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

-- Points on comment
CREATE TRIGGER trg_points_post_comment
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_comment();

-- Points on like received
CREATE OR REPLACE FUNCTION public.trg_points_on_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_author uuid;
BEGIN
  SELECT author_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    PERFORM public.award_points(v_author, 'like_received', 1);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_points_post_like
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_post_like();

-- Notify post author on comment
CREATE OR REPLACE FUNCTION public.trg_notify_post_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post_author uuid;
  v_actor_pseudo text;
BEGIN
  SELECT author_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.author_id;

  IF v_post_author IS NOT NULL AND v_post_author <> NEW.author_id THEN
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
    AND c.author_id <> COALESCE(v_post_author, '00000000-0000-0000-0000-000000000000'::uuid);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_post_comment_ins
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_post_comment();

ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
