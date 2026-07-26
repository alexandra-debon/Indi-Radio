
CREATE TABLE public.broadcast_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('logo','html')),
  logo_url text,
  link_url text,
  alt_text text,
  html_snippet text,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.broadcast_partners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_partners TO authenticated;
GRANT ALL ON public.broadcast_partners TO service_role;

ALTER TABLE public.broadcast_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active broadcast partners"
  ON public.broadcast_partners FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert broadcast partners"
  ON public.broadcast_partners FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update broadcast partners"
  ON public.broadcast_partners FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete broadcast partners"
  ON public.broadcast_partners FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER broadcast_partners_updated_at
  BEFORE UPDATE ON public.broadcast_partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

INSERT INTO public.broadcast_partners (name, kind, logo_url, link_url, alt_text, position)
VALUES (
  'TuneIn',
  'logo',
  'https://cdn-radiotime-logos.tunein.com/s1.png',
  'https://tunein.com/',
  'TuneIn',
  0
);
