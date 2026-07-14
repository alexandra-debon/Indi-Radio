
ALTER TABLE public.podcasts ADD COLUMN IF NOT EXISTS external_url text;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS external_url text;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.episodes ALTER COLUMN audio_url DROP NOT NULL;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS host text;

-- Admin write policies (in addition to existing public read policies)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins manage podcasts" ON public.podcasts;
  DROP POLICY IF EXISTS "Admins manage episodes" ON public.episodes;
  DROP POLICY IF EXISTS "Admins manage shows"    ON public.shows;
END $$;

CREATE POLICY "Admins manage podcasts" ON public.podcasts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage episodes" ON public.episodes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage shows" ON public.shows
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage RLS for the two buckets (buckets themselves are created via the storage tool)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read podcast-covers" ON storage.objects;
  DROP POLICY IF EXISTS "Admins write podcast-covers" ON storage.objects;
  DROP POLICY IF EXISTS "Public read show-covers" ON storage.objects;
  DROP POLICY IF EXISTS "Admins write show-covers" ON storage.objects;
END $$;

CREATE POLICY "Public read podcast-covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'podcast-covers');
CREATE POLICY "Admins write podcast-covers" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'podcast-covers' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'podcast-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read show-covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'show-covers');
CREATE POLICY "Admins write show-covers" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'show-covers' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'show-covers' AND public.has_role(auth.uid(), 'admin'));
