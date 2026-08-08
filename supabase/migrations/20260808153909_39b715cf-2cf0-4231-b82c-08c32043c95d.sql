
CREATE OR REPLACE FUNCTION public.gallery_owner_public(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.gallery_visible = true
      AND p.quarantined_at IS NULL
  )
$$;

REVOKE ALL ON FUNCTION public.gallery_owner_public(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.gallery_owner_public(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "artist-gallery read anon" ON storage.objects;
DROP POLICY IF EXISTS "artist-gallery read auth" ON storage.objects;

CREATE POLICY "artist-gallery read anon"
  ON storage.objects FOR SELECT TO anon
  USING (
    bucket_id = 'artist-gallery'
    AND public.gallery_owner_public(
      COALESCE(owner, NULLIF((storage.foldername(name))[1], '')::uuid)
    )
  );

CREATE POLICY "artist-gallery read auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'artist-gallery'
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
      OR public.gallery_owner_public(
        COALESCE(owner, NULLIF((storage.foldername(name))[1], '')::uuid)
      )
    )
  );

-- Gallery images actually uploaded under content-images/artist-gallery/<uid>/...
DROP POLICY IF EXISTS "content-images scoped read" ON storage.objects;

CREATE POLICY "content-images scoped read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'content-images'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR (
        owner IS NOT NULL
        AND NOT public.is_quarantined(owner)
        AND (
          (storage.foldername(name))[1] IS DISTINCT FROM 'artist-gallery'
          OR public.gallery_owner_public(
               COALESCE(NULLIF((storage.foldername(name))[2], '')::uuid, owner)
             )
        )
      )
    )
  );
