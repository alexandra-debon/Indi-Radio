ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS artist_video_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ep_download_url text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_artist_video_urls_limit
    CHECK (cardinality(artist_video_urls) <= 6) NOT VALID,
  ADD CONSTRAINT profiles_ep_download_url_length
    CHECK (ep_download_url IS NULL OR char_length(ep_download_url) <= 1000) NOT VALID;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

COMMENT ON COLUMN public.profiles.artist_video_urls IS 'Up to six public YouTube, Vimeo, Spotify or SoundCloud URLs selected by the artist.';
COMMENT ON COLUMN public.profiles.ep_download_url IS 'External HTTPS URL used by the public Download my EP button.';