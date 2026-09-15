CREATE TABLE public.village_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,
  cover_url text,
  video_url text,
  category text CHECK (category IN ('musique','livre','art')),
  visibility text NOT NULL DEFAULT 'feed' CHECK (visibility IN ('feed','village_only')),
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX village_articles_created_idx ON public.village_articles (created_at DESC);
CREATE INDEX village_articles_author_idx ON public.village_articles (author_id);

GRANT SELECT ON public.village_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.village_articles TO authenticated;
GRANT ALL ON public.village_articles TO service_role;

ALTER TABLE public.village_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published village articles"
  ON public.village_articles FOR SELECT
  USING (published = true OR auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can create own village article"
  ON public.village_articles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT public.is_quarantined(auth.uid()));

CREATE POLICY "Author or admin can update village article"
  ON public.village_articles FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Author or admin can delete village article"
  ON public.village_articles FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.village_articles_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := regexp_replace(lower(public.unaccent_fallback(NEW.title)), '[^a-z0-9]+', '-', 'g');
    base := trim(both '-' from base);
    IF base = '' THEN base := 'article'; END IF;
    base := left(base, 60);
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.village_articles v WHERE v.slug = candidate AND v.id IS DISTINCT FROM NEW.id) LOOP
      n := n + 1;
      candidate := base || '-' || n::text;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER village_articles_slug
BEFORE INSERT OR UPDATE ON public.village_articles
FOR EACH ROW EXECUTE FUNCTION public.village_articles_set_slug();