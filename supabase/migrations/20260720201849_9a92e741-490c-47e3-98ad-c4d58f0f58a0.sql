
CREATE TABLE public.image_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, post_id, image_url)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_reports TO authenticated;
GRANT ALL ON public.image_reports TO service_role;

ALTER TABLE public.image_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own image reports"
  ON public.image_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users read own image reports"
  ON public.image_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Admins read all image reports"
  ON public.image_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update image reports"
  ON public.image_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete image reports"
  ON public.image_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX image_reports_status_idx ON public.image_reports (status, created_at DESC);
CREATE INDEX image_reports_post_idx ON public.image_reports (post_id);
