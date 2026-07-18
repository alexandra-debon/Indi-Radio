
CREATE TABLE public.post_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_comment_likes TO authenticated;
GRANT SELECT ON public.post_comment_likes TO anon;
GRANT ALL ON public.post_comment_likes TO service_role;
ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read post_comment_likes" ON public.post_comment_likes FOR SELECT USING (true);
CREATE POLICY "insert own post_comment_likes" ON public.post_comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own post_comment_likes" ON public.post_comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX post_comment_likes_comment_id_idx ON public.post_comment_likes(comment_id);

CREATE TABLE public.news_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.news_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.news_comment_likes TO authenticated;
GRANT SELECT ON public.news_comment_likes TO anon;
GRANT ALL ON public.news_comment_likes TO service_role;
ALTER TABLE public.news_comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read news_comment_likes" ON public.news_comment_likes FOR SELECT USING (true);
CREATE POLICY "insert own news_comment_likes" ON public.news_comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own news_comment_likes" ON public.news_comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX news_comment_likes_comment_id_idx ON public.news_comment_likes(comment_id);
