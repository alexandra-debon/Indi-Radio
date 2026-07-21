
CREATE TABLE public.onboarding_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating TEXT NOT NULL CHECK (rating IN ('up','down')),
  message TEXT,
  lang TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.onboarding_feedback TO anon, authenticated;
GRANT ALL ON public.onboarding_feedback TO service_role;
ALTER TABLE public.onboarding_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit onboarding feedback"
  ON public.onboarding_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Admins can read onboarding feedback"
  ON public.onboarding_feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
