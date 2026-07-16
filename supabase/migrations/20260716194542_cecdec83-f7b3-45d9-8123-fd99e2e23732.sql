
CREATE TABLE public.magazine_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  magazine_url TEXT NOT NULL,
  cover_url TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pinned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.magazine_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.magazine_entries TO authenticated;
GRANT ALL ON public.magazine_entries TO service_role;

ALTER TABLE public.magazine_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Magazine entries are viewable by everyone"
ON public.magazine_entries FOR SELECT
USING (true);

CREATE POLICY "Admins can insert magazine entries"
ON public.magazine_entries FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update magazine entries"
ON public.magazine_entries FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete magazine entries"
ON public.magazine_entries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_magazine_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_magazine_entries_updated_at
BEFORE UPDATE ON public.magazine_entries
FOR EACH ROW EXECUTE FUNCTION public.touch_magazine_entries_updated_at();

CREATE INDEX magazine_entries_pinned_created_idx
ON public.magazine_entries (pinned_at DESC NULLS LAST, created_at DESC);
