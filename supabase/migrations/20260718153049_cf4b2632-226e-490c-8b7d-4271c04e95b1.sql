
CREATE TABLE public.content_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id, user_id)
);
CREATE INDEX content_likes_lookup ON public.content_likes (content_type, content_id);
GRANT SELECT ON public.content_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.content_likes TO authenticated;
GRANT ALL ON public.content_likes TO service_role;
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_likes select all" ON public.content_likes FOR SELECT USING (true);
CREATE POLICY "content_likes insert own" ON public.content_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "content_likes delete own" ON public.content_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.content_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(btrim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_comments_lookup ON public.content_comments (content_type, content_id, created_at DESC);
GRANT SELECT ON public.content_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_comments TO authenticated;
GRANT ALL ON public.content_comments TO service_role;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_comments select all" ON public.content_comments FOR SELECT USING (true);
CREATE POLICY "content_comments insert own" ON public.content_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "content_comments update own" ON public.content_comments FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "content_comments delete own or admin" ON public.content_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER content_comments_touch BEFORE UPDATE ON public.content_comments FOR EACH ROW EXECUTE FUNCTION public.touch_album_reviews_updated_at();

CREATE TABLE public.content_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id, user_id)
);
CREATE INDEX content_ratings_lookup ON public.content_ratings (content_type, content_id);
GRANT SELECT ON public.content_ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_ratings TO authenticated;
GRANT ALL ON public.content_ratings TO service_role;
ALTER TABLE public.content_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_ratings select all" ON public.content_ratings FOR SELECT USING (true);
CREATE POLICY "content_ratings insert own" ON public.content_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "content_ratings update own" ON public.content_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "content_ratings delete own or admin" ON public.content_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER content_ratings_touch BEFORE UPDATE ON public.content_ratings FOR EACH ROW EXECUTE FUNCTION public.touch_album_reviews_updated_at();
