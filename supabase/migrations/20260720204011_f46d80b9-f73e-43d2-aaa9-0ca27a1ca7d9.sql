CREATE TABLE public.album_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.photo_albums(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (album_id, reporter_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_reports TO authenticated;
GRANT ALL ON public.album_reports TO service_role;

ALTER TABLE public.album_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporter can insert own report"
ON public.album_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporter can view own report"
ON public.album_reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all album reports"
ON public.album_reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update album reports"
ON public.album_reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete album reports"
ON public.album_reports FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX album_reports_status_idx ON public.album_reports (status, created_at DESC);
CREATE INDEX album_reports_album_idx ON public.album_reports (album_id);