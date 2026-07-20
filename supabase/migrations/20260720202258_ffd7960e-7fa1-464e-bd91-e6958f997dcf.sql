
CREATE TABLE IF NOT EXISTS public.photo_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.photo_albums TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_albums TO authenticated;
GRANT ALL ON public.photo_albums TO service_role;

ALTER TABLE public.photo_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Albums are publicly readable"
  ON public.photo_albums FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own albums"
  ON public.photo_albums FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own albums"
  ON public.photo_albums FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own albums"
  ON public.photo_albums FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS photo_albums_owner_idx ON public.photo_albums(owner_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_photo_albums_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.touch_photo_albums_updated_at() FROM PUBLIC;

CREATE TRIGGER photo_albums_touch_updated_at
  BEFORE UPDATE ON public.photo_albums
  FOR EACH ROW EXECUTE FUNCTION public.touch_photo_albums_updated_at();

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES public.photo_albums(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_album_idx ON public.posts(album_id) WHERE album_id IS NOT NULL;
