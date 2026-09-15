-- Ajoute la visibilité "followers_only" aux publications
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_visibility_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_visibility_check
  CHECK (visibility IN ('feed', 'profile_only', 'followers_only')) NOT VALID;

-- Lecture : les publications réservées aux abonnés ne sont visibles que par
-- l'auteur, ses abonnés et les admins. Chaque branche est évaluable par anon.
DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
CREATE POLICY "Anyone can read posts" ON public.posts
  FOR SELECT
  USING (
    (
      (NOT public.is_quarantined(author_id))
      OR auth.uid() = author_id
      OR public.has_role(auth.uid(), 'admin')
    )
    AND (
      visibility IS DISTINCT FROM 'followers_only'
      OR auth.uid() = author_id
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.artist_follows f
        WHERE f.artist_id = posts.author_id
          AND f.follower_id = auth.uid()
      )
    )
  );
