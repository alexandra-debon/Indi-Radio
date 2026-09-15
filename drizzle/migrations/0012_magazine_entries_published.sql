ALTER TABLE public.magazine_entries
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Magazine entries are viewable by everyone" ON public.magazine_entries;
CREATE POLICY "Magazine entries are viewable by everyone"
ON public.magazine_entries
FOR SELECT
USING (published OR has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.magazine_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.magazine_entries TO authenticated;
GRANT ALL ON public.magazine_entries TO service_role;