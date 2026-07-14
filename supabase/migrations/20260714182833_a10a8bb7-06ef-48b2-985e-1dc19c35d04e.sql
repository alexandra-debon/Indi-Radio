DROP POLICY IF EXISTS "Anyone can read ratings" ON public.episode_ratings;
CREATE POLICY "Authenticated can read ratings" ON public.episode_ratings FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.episode_ratings FROM anon;