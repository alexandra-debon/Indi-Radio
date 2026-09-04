DROP POLICY "Anyone can read comments" ON public.news_comments;

CREATE POLICY "Anon can read approved comments"
ON public.news_comments
FOR SELECT
TO anon
USING (status = 'approved');

CREATE POLICY "Authenticated can read comments"
ON public.news_comments
FOR SELECT
TO authenticated
USING (
  status = 'approved'
  OR auth.uid() = author_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.can_publish_news(auth.uid())
);