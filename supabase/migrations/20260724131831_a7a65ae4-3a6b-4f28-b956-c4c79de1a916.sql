
CREATE OR REPLACE FUNCTION public.enforce_pseudo_change_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_last timestamptz;
  v_cooldown interval := interval '14 days';
BEGIN
  -- Only enforce on direct client updates, not internal triggers
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.pseudo IS NOT DISTINCT FROM OLD.pseudo THEN RETURN NEW; END IF;
  -- Admins bypass the cooldown
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  -- Only enforce when called from a client (JWT context present)
  IF current_setting('request.jwt.claims', true) IS NULL THEN RETURN NEW; END IF;

  SELECT max(changed_at) INTO v_last
  FROM public.pseudo_history
  WHERE user_id = NEW.id;

  IF v_last IS NOT NULL AND now() - v_last < v_cooldown THEN
    RAISE EXCEPTION 'PSEUDO_COOLDOWN:%', extract(epoch from (v_last + v_cooldown - now()))::bigint;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pseudo_change_cooldown_trg ON public.profiles;
CREATE TRIGGER enforce_pseudo_change_cooldown_trg
BEFORE UPDATE OF pseudo ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_pseudo_change_cooldown();
