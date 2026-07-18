
CREATE TABLE public.comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  comment_type text NOT NULL CHECK (comment_type IN ('content_comment','news_comment','post_comment')),
  comment_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comment_reports_status_idx ON public.comment_reports(status, created_at DESC);
CREATE UNIQUE INDEX comment_reports_unique_pending
  ON public.comment_reports(reporter_id, comment_type, comment_id)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_reports TO authenticated;
GRANT ALL ON public.comment_reports TO service_role;

ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can report"
  ON public.comment_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "admins read reports"
  ON public.comment_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update reports"
  ON public.comment_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete reports"
  ON public.comment_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
