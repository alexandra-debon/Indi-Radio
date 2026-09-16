CREATE TABLE public.teevi_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  video_url text NOT NULL,
  summary text,
  tags text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.teevi_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teevi_videos TO authenticated;
GRANT ALL ON public.teevi_videos TO service_role;

ALTER TABLE public.teevi_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teevi_videos read published or admin" ON public.teevi_videos
  FOR SELECT USING (published OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "teevi_videos admin insert" ON public.teevi_videos
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "teevi_videos admin update" ON public.teevi_videos
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "teevi_videos admin delete" ON public.teevi_videos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER teevi_videos_touch_updated_at
  BEFORE UPDATE ON public.teevi_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TABLE public.teevi_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.teevi_videos(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_urls text[] NOT NULL DEFAULT '{}',
  image_captions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX teevi_comments_video_idx ON public.teevi_comments (video_id, created_at);

GRANT SELECT ON public.teevi_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teevi_comments TO authenticated;
GRANT ALL ON public.teevi_comments TO service_role;

ALTER TABLE public.teevi_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teevi_comments read all" ON public.teevi_comments
  FOR SELECT USING ((NOT public.is_quarantined(author_id)) OR (auth.uid() = author_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "teevi_comments insert own" ON public.teevi_comments
  FOR INSERT TO authenticated WITH CHECK ((auth.uid() = author_id) AND (NOT public.is_quarantined(auth.uid())));
CREATE POLICY "teevi_comments update own" ON public.teevi_comments
  FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "teevi_comments delete own or admin" ON public.teevi_comments
  FOR DELETE TO authenticated USING ((auth.uid() = author_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.teevi_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.teevi_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);

GRANT SELECT ON public.teevi_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.teevi_likes TO authenticated;
GRANT ALL ON public.teevi_likes TO service_role;

ALTER TABLE public.teevi_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teevi_likes read all" ON public.teevi_likes
  FOR SELECT USING (true);
CREATE POLICY "teevi_likes insert own" ON public.teevi_likes
  FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) AND (NOT public.is_quarantined(auth.uid())));
CREATE POLICY "teevi_likes delete own" ON public.teevi_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);