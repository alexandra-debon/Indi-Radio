CREATE TABLE public.shop_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.artist_shop_items(id) ON DELETE SET NULL,
  artist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  item_title text NOT NULL,
  artist_pseudo text,
  cta_kind text NOT NULL DEFAULT 'buy',
  format text,
  external_url text,
  source text NOT NULL DEFAULT 'artist',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shop_click_events_created_at_idx ON public.shop_click_events (created_at DESC);
CREATE INDEX shop_click_events_artist_idx ON public.shop_click_events (artist_id);

GRANT INSERT ON public.shop_click_events TO anon;
GRANT INSERT, SELECT ON public.shop_click_events TO authenticated;
GRANT ALL ON public.shop_click_events TO service_role;

ALTER TABLE public.shop_click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a shop click"
  ON public.shop_click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read shop clicks"
  ON public.shop_click_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
