
CREATE TABLE IF NOT EXISTS public.content_translations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  entity_key text NOT NULL,
  field text NOT NULL,
  lang text NOT NULL,
  source_hash text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_key, field, lang)
);

GRANT SELECT ON public.content_translations TO anon, authenticated;
GRANT ALL ON public.content_translations TO service_role;

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translations_public_read"
  ON public.content_translations
  FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS content_translations_lookup_idx
  ON public.content_translations (entity_type, entity_key, lang);
