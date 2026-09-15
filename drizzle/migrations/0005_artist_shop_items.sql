-- Sections visibility toggles on profiles (artist self-service)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_events_section boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_shop_section boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_posts_section boolean NOT NULL DEFAULT true;

-- Artist shop
CREATE TABLE public.artist_shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  format text NOT NULL DEFAULT 'Autre',
  image_url text,
  summary text,
  external_url text,
  tags text[],
  is_visible boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artist_shop_items_format_check
    CHECK (format IN ('Vinyle','CD','K7','Livre','Merch','Autre'))
);

CREATE INDEX artist_shop_items_artist_idx ON public.artist_shop_items (artist_id, position, created_at DESC);

GRANT SELECT ON public.artist_shop_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_shop_items TO authenticated;
GRANT ALL ON public.artist_shop_items TO service_role;

ALTER TABLE public.artist_shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read visible shop items"
  ON public.artist_shop_items FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Owner or admin can read own shop items"
  ON public.artist_shop_items FOR SELECT
  TO authenticated
  USING (auth.uid() = artist_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can insert own shop items"
  ON public.artist_shop_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = artist_id AND NOT public.is_quarantined(auth.uid()));

CREATE POLICY "Owner or admin can update shop items"
  ON public.artist_shop_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = artist_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = artist_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner or admin can delete shop items"
  ON public.artist_shop_items FOR DELETE
  TO authenticated
  USING (auth.uid() = artist_id OR public.has_role(auth.uid(), 'admin'));

-- Editorial tags are admin-only (same protection principle as role_request_status)
CREATE OR REPLACE FUNCTION public.protect_shop_item_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF current_setting('request.jwt.claims', true) IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.tags := NULL;
  ELSE
    NEW.tags := OLD.tags;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_shop_item_tags
BEFORE INSERT OR UPDATE ON public.artist_shop_items
FOR EACH ROW EXECUTE FUNCTION public.protect_shop_item_tags();

CREATE TRIGGER trg_touch_shop_items
BEFORE UPDATE ON public.artist_shop_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();