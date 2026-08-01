ALTER TABLE public.playlist_entries ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.unaccent_fallback(_t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate(_t,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY')
$$;

CREATE OR REPLACE FUNCTION public.slugify_playlist_title(_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT nullif(
    trim(both '-' from regexp_replace(lower(public.unaccent_fallback(_title)), '[^a-z0-9]+', '-', 'g')),
    ''
  )
$$;

CREATE OR REPLACE FUNCTION public.playlist_entries_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND trim(NEW.slug) <> '' THEN
    base := public.slugify_playlist_title(NEW.slug);
  ELSE
    base := public.slugify_playlist_title(NEW.title);
  END IF;
  IF base IS NULL THEN
    base := 'playlist';
  END IF;
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.playlist_entries p
    WHERE p.slug = candidate AND p.id IS DISTINCT FROM NEW.id
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

UPDATE public.playlist_entries SET slug = NULL;

DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, title FROM public.playlist_entries ORDER BY created_at LOOP
    base := coalesce(public.slugify_playlist_title(r.title), 'playlist');
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM public.playlist_entries p WHERE p.slug = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE public.playlist_entries SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.playlist_entries ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS playlist_entries_slug_key ON public.playlist_entries (slug);

DROP TRIGGER IF EXISTS trg_playlist_entries_set_slug ON public.playlist_entries;
CREATE TRIGGER trg_playlist_entries_set_slug
BEFORE INSERT OR UPDATE OF slug, title ON public.playlist_entries
FOR EACH ROW EXECUTE FUNCTION public.playlist_entries_set_slug();