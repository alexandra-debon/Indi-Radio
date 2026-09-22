CREATE OR REPLACE FUNCTION public.artist_media_urls_valid(_urls text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT cardinality(COALESCE(_urls, '{}'::text[])) <= 6
    AND COALESCE(bool_and(
      url ~ '^https://'
      AND url ~* '^https://([^/]+\.)?(youtube\.com|youtu\.be|vimeo\.com|spotify\.com|soundcloud\.com)/'
    ), true)
  FROM unnest(COALESCE(_urls, '{}'::text[])) AS url
$$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_artist_video_urls_valid
    CHECK (public.artist_media_urls_valid(artist_video_urls)) NOT VALID,
  ADD CONSTRAINT profiles_ep_download_url_https
    CHECK (ep_download_url IS NULL OR ep_download_url ~ '^https://[^[:space:]]+$') NOT VALID;

COMMENT ON FUNCTION public.artist_media_urls_valid(text[]) IS 'Validates the artist-selected media list and its supported HTTPS hosts.';