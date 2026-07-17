-- 1. Columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quarantined_at timestamptz,
  ADD COLUMN IF NOT EXISTS quarantine_reason text;

-- 2. Helper function
CREATE OR REPLACE FUNCTION public.is_quarantined(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT quarantined_at IS NOT NULL FROM public.profiles WHERE id = _user_id),
    false
  );
$$;

-- 3. Block inserts by quarantined users
DROP POLICY IF EXISTS "Authenticated can post" ON public.posts;
CREATE POLICY "Authenticated can post" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT public.is_quarantined(auth.uid()));

DROP POLICY IF EXISTS "post_comments insert own" ON public.post_comments;
CREATE POLICY "post_comments insert own" ON public.post_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT public.is_quarantined(auth.uid()));

DROP POLICY IF EXISTS "post_likes insert own" ON public.post_likes;
CREATE POLICY "post_likes insert own" ON public.post_likes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_quarantined(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can comment" ON public.news_comments;
CREATE POLICY "Authenticated can comment" ON public.news_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT public.is_quarantined(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can like news" ON public.news_likes;
CREATE POLICY "Authenticated can like news" ON public.news_likes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_quarantined(auth.uid()));

DROP POLICY IF EXISTS "Admins and animateurs can publish news" ON public.news_posts;
CREATE POLICY "Admins and animateurs can publish news" ON public.news_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND NOT public.is_quarantined(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'animateur'))
  );

DROP POLICY IF EXISTS "Authenticated can like" ON public.track_likes;
CREATE POLICY "Authenticated can like" ON public.track_likes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_quarantined(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can create request" ON public.requests;
CREATE POLICY "Authenticated can create request" ON public.requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT public.is_quarantined(auth.uid()));

-- 4. Hide content from quarantined authors (except owner + admin)
DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
CREATE POLICY "Anyone can read posts" ON public.posts
  FOR SELECT
  USING (
    NOT public.is_quarantined(author_id)
    OR auth.uid() = author_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "post_comments read all" ON public.post_comments;
CREATE POLICY "post_comments read all" ON public.post_comments
  FOR SELECT
  USING (
    NOT public.is_quarantined(author_id)
    OR auth.uid() = author_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Anyone can read news" ON public.news_posts;
CREATE POLICY "Anyone can read news" ON public.news_posts
  FOR SELECT
  USING (
    NOT public.is_quarantined(author_id)
    OR auth.uid() = author_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Anyone can read comments" ON public.news_comments;
CREATE POLICY "Anyone can read comments" ON public.news_comments
  FOR SELECT
  USING (
    NOT public.is_quarantined(author_id)
    OR auth.uid() = author_id
    OR public.has_role(auth.uid(), 'admin')
  );