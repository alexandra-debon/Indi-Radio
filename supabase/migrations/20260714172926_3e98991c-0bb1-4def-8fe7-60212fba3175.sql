
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pin_label text;

CREATE INDEX IF NOT EXISTS posts_pinned_at_idx ON public.posts (pinned_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.protect_post_pin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.pinned_at IS DISTINCT FROM OLD.pinned_at
      OR NEW.pin_label IS DISTINCT FROM OLD.pin_label)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
      RAISE EXCEPTION 'Only admins can pin posts';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_post_pin_fields ON public.posts;
CREATE TRIGGER trg_protect_post_pin_fields
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.protect_post_pin_fields();
