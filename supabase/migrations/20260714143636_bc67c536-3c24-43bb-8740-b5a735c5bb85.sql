
-- 1) Move tel_auditeur to a private table
CREATE TABLE IF NOT EXISTS public.profile_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tel_auditeur text UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_contacts TO authenticated;
GRANT ALL ON public.profile_contacts TO service_role;

ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own contact"
  ON public.profile_contacts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users upsert own contact"
  ON public.profile_contacts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own contact"
  ON public.profile_contacts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own contact"
  ON public.profile_contacts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Migrate existing data
INSERT INTO public.profile_contacts (user_id, tel_auditeur)
SELECT id, tel_auditeur FROM public.profiles WHERE tel_auditeur IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Remove sensitive column from public-readable table
ALTER TABLE public.profiles DROP COLUMN tel_auditeur;

-- 2) Harden award_presence_point: derive user from auth.uid(); revoke direct execute
CREATE OR REPLACE FUNCTION public.award_presence_point()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today_count int;
  v_daily_cap constant int := 10;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO v_today_count
  FROM public.point_events
  WHERE user_id = v_uid
    AND action = 'presence'
    AND created_at >= date_trunc('day', now());
  IF v_today_count >= v_daily_cap THEN RETURN false; END IF;
  PERFORM public.award_points(v_uid, 'presence', 1);
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.award_presence_point() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_presence_point() TO authenticated;

-- Drop the vulnerable parameterized version
DROP FUNCTION IF EXISTS public.award_presence_point(uuid);

-- 3) Newsletter INSERT policy: enforce basic email validation instead of always-true
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe with valid email"
  ON public.newsletter_subscribers FOR INSERT TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 5 AND 254
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );
