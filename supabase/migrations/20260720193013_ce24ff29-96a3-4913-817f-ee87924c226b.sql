
CREATE POLICY "content-images admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'content-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "content-images admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'content-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "content-images admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'content-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "content-images public read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'content-images');
