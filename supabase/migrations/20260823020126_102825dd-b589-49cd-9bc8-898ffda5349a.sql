CREATE TABLE IF NOT EXISTS public.blog_authors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_authors TO authenticated;
GRANT ALL ON public.blog_authors TO service_role;

ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read blog authors"
  ON public.blog_authors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage blog authors"
  ON public.blog_authors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_blog_authors_updated_at
  BEFORE UPDATE ON public.blog_authors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE OR REPLACE FUNCTION public.can_publish_news(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.blog_authors ba WHERE ba.user_id = _user_id)
  );
$$;

DROP POLICY IF EXISTS "Admins and animateurs can publish news" ON public.news_posts;
CREATE POLICY "Admins and blog authors can publish news"
  ON public.news_posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND NOT public.is_quarantined(auth.uid())
    AND public.can_publish_news(auth.uid())
  );

DROP POLICY IF EXISTS "Owner or admin updates news" ON public.news_posts;
CREATE POLICY "Owner or admin updates news"
  ON public.news_posts FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (auth.uid() = author_id AND public.can_publish_news(auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (auth.uid() = author_id AND public.can_publish_news(auth.uid()))
  );