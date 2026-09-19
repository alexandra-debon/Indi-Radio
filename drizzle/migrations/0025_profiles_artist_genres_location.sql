ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS artist_genres text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS artist_location text;

GRANT SELECT (artist_genres, artist_location) ON public.profiles TO anon;
GRANT SELECT (artist_genres, artist_location) ON public.profiles TO authenticated;
GRANT UPDATE (artist_genres, artist_location) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_artist_genres_count_check,
  ADD CONSTRAINT profiles_artist_genres_count_check CHECK (cardinality(artist_genres) <= 8),
  DROP CONSTRAINT IF EXISTS profiles_artist_location_length_check,
  ADD CONSTRAINT profiles_artist_location_length_check CHECK (artist_location IS NULL OR char_length(artist_location) <= 120);