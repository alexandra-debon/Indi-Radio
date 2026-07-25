
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stage_name text,
  ADD COLUMN IF NOT EXISTS gallery_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS gallery_cover_url text,
  ADD COLUMN IF NOT EXISTS gallery_summary text;

-- Étendre la protection colonne-par-colonne aux nouveaux champs d'annuaire
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_certified IS DISTINCT FROM OLD.is_certified
      OR NEW.is_team_indi IS DISTINCT FROM OLD.is_team_indi
      OR NEW.badges IS DISTINCT FROM OLD.badges
      OR NEW.points IS DISTINCT FROM OLD.points
      OR NEW.level IS DISTINCT FROM OLD.level
      OR NEW.stage_name IS DISTINCT FROM OLD.stage_name
      OR NEW.gallery_cover_url IS DISTINCT FROM OLD.gallery_cover_url
      OR NEW.gallery_summary IS DISTINCT FROM OLD.gallery_summary)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Policies storage : bucket artist-gallery
CREATE POLICY "artist-gallery read auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'artist-gallery');

CREATE POLICY "artist-gallery read anon"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'artist-gallery');

CREATE POLICY "artist-gallery admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artist-gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "artist-gallery admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'artist-gallery' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'artist-gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "artist-gallery admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'artist-gallery' AND public.has_role(auth.uid(), 'admin'));
