
DROP POLICY IF EXISTS "content-images admin insert" ON storage.objects;
DROP POLICY IF EXISTS "content-images admin update" ON storage.objects;
DROP POLICY IF EXISTS "content-images admin delete" ON storage.objects;

CREATE POLICY "content-images authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'content-images' AND owner = auth.uid());

CREATE POLICY "content-images owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'content-images' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (bucket_id = 'content-images' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "content-images owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'content-images' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
