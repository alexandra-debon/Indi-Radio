ALTER TABLE public.artist_shop_items
  ADD COLUMN IF NOT EXISTS cta_kind text NOT NULL DEFAULT 'buy',
  ADD COLUMN IF NOT EXISTS in_public_shop boolean NOT NULL DEFAULT false;

ALTER TABLE public.artist_shop_items
  DROP CONSTRAINT IF EXISTS artist_shop_items_cta_kind_check;

ALTER TABLE public.artist_shop_items
  ADD CONSTRAINT artist_shop_items_cta_kind_check
  CHECK (cta_kind IN ('buy', 'preorder', 'ticket'));

GRANT SELECT ON public.artist_shop_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_shop_items TO authenticated;
GRANT ALL ON public.artist_shop_items TO service_role;