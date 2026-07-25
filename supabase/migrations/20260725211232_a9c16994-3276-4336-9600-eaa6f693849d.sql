-- Scope content-images public read to non-quarantined owners
DROP POLICY IF EXISTS "content-images public read" ON storage.objects;

CREATE POLICY "content-images scoped read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'content-images'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR (
        owner IS NOT NULL
        AND NOT public.is_quarantined(owner)
      )
    )
  );