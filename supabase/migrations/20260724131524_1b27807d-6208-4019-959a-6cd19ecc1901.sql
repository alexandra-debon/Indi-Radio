
CREATE TABLE IF NOT EXISTS public.pseudo_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_pseudo TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pseudo_history_old_pseudo_lower_idx ON public.pseudo_history (LOWER(old_pseudo));
CREATE INDEX IF NOT EXISTS pseudo_history_user_id_idx ON public.pseudo_history (user_id);

GRANT SELECT ON public.pseudo_history TO anon, authenticated;
GRANT ALL ON public.pseudo_history TO service_role;

ALTER TABLE public.pseudo_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pseudo history is publicly readable"
  ON public.pseudo_history FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.record_pseudo_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pseudo IS DISTINCT FROM OLD.pseudo AND OLD.pseudo IS NOT NULL AND LENGTH(TRIM(OLD.pseudo)) > 0 THEN
    -- Free the old pseudo if it was reserved by this same user
    DELETE FROM public.pseudo_history WHERE LOWER(old_pseudo) = LOWER(NEW.pseudo);
    -- Reserve the old pseudo to redirect future visitors
    INSERT INTO public.pseudo_history (user_id, old_pseudo)
    VALUES (NEW.id, OLD.pseudo)
    ON CONFLICT ((LOWER(old_pseudo))) DO UPDATE
      SET user_id = EXCLUDED.user_id, changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_pseudo_change ON public.profiles;
CREATE TRIGGER trg_record_pseudo_change
  AFTER UPDATE OF pseudo ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.record_pseudo_change();
