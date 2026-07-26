ALTER TABLE public.broadcast_partners
  ADD COLUMN IF NOT EXISTS visible_on text[]
    NOT NULL
    DEFAULT ARRAY['web_desktop','pwa_android','pwa_ios']::text[];

ALTER TABLE public.broadcast_partners
  DROP CONSTRAINT IF EXISTS broadcast_partners_visible_on_check;

ALTER TABLE public.broadcast_partners
  ADD CONSTRAINT broadcast_partners_visible_on_check
  CHECK (
    visible_on <@ ARRAY['web_desktop','pwa_android','pwa_ios']::text[]
    AND array_length(visible_on, 1) IS NOT NULL
  );