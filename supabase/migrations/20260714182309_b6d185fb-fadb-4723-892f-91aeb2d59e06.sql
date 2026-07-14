CREATE TABLE public.album_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  artist text NOT NULL,
  label text,
  cover_url text,
  release_date date,
  rating numeric(2,1) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  excerpt text,
  content text NOT NULL,
  spotify_url text,
  bandcamp_url text,
  youtube_url text,
  soundcloud_url text,
  apple_music_url text,
  published boolean NOT NULL DEFAULT true,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX album_reviews_published_created_idx ON public.album_reviews (published, created_at DESC);
CREATE INDEX album_reviews_author_idx ON public.album_reviews (author_id);

GRANT SELECT ON public.album_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_reviews TO authenticated;
GRANT ALL ON public.album_reviews TO service_role;

ALTER TABLE public.album_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published reviews"
  ON public.album_reviews FOR SELECT
  USING (published = true);

CREATE POLICY "Authors can read their own reviews"
  ON public.album_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and animateurs can insert reviews"
  ON public.album_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'animateur'))
  );

CREATE POLICY "Authors and admins can update reviews"
  ON public.album_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors and admins can delete reviews"
  ON public.album_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_album_reviews_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER album_reviews_updated_at
  BEFORE UPDATE ON public.album_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_album_reviews_updated_at();