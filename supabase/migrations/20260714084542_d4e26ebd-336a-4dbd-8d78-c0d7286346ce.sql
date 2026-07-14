
-- =====================================================================
-- INDI RADIO — INITIAL SCHEMA
-- =====================================================================

-- Enum for roles (validated centrally)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('auditeur', 'artiste', 'animateur', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudo text UNIQUE NOT NULL,
  tel_auditeur text UNIQUE,
  role public.app_role NOT NULL DEFAULT 'auditeur',
  is_certified boolean NOT NULL DEFAULT false,
  avatar_url text,
  points int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security-definer role helper (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role);
$$;

-- Everyone (even anon) can read basic profile info to display pseudo/badge/certification
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

-- A user can create their own profile row (used by trigger, but keeps client safe too)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update their own SAFE fields; role/is_certified/points/level are frozen client-side
CREATE POLICY "Users can update own safe fields"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can update anything
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enforce non-admins cannot touch role or is_certified via a trigger (belt & braces)
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_certified IS DISTINCT FROM OLD.is_certified
      OR NEW.points IS DISTINCT FROM OLD.points
      OR NEW.level IS DISTINCT FROM OLD.level)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    -- points/level are still updated by SECURITY DEFINER functions which set auth.uid() to null OR run as admin;
    -- allow them when session_user is postgres (trigger firing from award_points) by checking current_setting.
    IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER profiles_protect_privileged
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- Auto-create profile on new auth.users row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pseudo text;
BEGIN
  v_pseudo := COALESCE(NEW.raw_user_meta_data->>'pseudo', 'auditeur_' || substr(NEW.id::text, 1, 8));
  -- Ensure uniqueness by suffixing if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE pseudo = v_pseudo) LOOP
    v_pseudo := v_pseudo || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;

  INSERT INTO public.profiles (id, pseudo, role, points, level, is_certified)
  VALUES (NEW.id, v_pseudo, 'auditeur', 0, 1, false);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- GAMIFICATION
-- ---------------------------------------------------------------------
CREATE TABLE public.point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('post','like_received','comment','presence','dedicace')),
  points_awarded int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX point_events_user_idx ON public.point_events(user_id, created_at DESC);

GRANT SELECT ON public.point_events TO authenticated;
GRANT ALL ON public.point_events TO service_role;

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own point events"
ON public.point_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all point events"
ON public.point_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Level function
CREATE OR REPLACE FUNCTION public.calculate_level(pts int)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN pts < 20 THEN 1
    WHEN pts < 60 THEN 2
    WHEN pts < 150 THEN 3
    WHEN pts < 300 THEN 4
    ELSE 5
  END;
$$;

-- Award points helper (SECURITY DEFINER so triggers bypass RLS/protect trigger)
CREATE OR REPLACE FUNCTION public.award_points(p_user_id uuid, p_action text, p_points int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.point_events (user_id, action, points_awarded)
  VALUES (p_user_id, p_action, p_points);

  UPDATE public.profiles
  SET points = points + p_points,
      level  = public.calculate_level(points + p_points)
  WHERE id = p_user_id;
END; $$;

-- Presence: server function will check daily cap then call this
CREATE OR REPLACE FUNCTION public.award_presence_point(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today_count int;
  v_daily_cap constant int := 10;
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO v_today_count
  FROM public.point_events
  WHERE user_id = p_user_id
    AND action = 'presence'
    AND created_at >= date_trunc('day', now());
  IF v_today_count >= v_daily_cap THEN RETURN false; END IF;
  PERFORM public.award_points(p_user_id, 'presence', 1);
  RETURN true;
END; $$;

-- ---------------------------------------------------------------------
-- TRACK HISTORY + LIKES
-- ---------------------------------------------------------------------
CREATE TABLE public.track_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX track_history_played_idx ON public.track_history(played_at DESC);

GRANT SELECT ON public.track_history TO anon, authenticated;
GRANT ALL ON public.track_history TO service_role;

ALTER TABLE public.track_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read track history"
ON public.track_history FOR SELECT USING (true);

CREATE TABLE public.track_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_history_id uuid NOT NULL REFERENCES public.track_history(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(track_history_id, user_id)
);

CREATE INDEX track_likes_track_idx ON public.track_likes(track_history_id);

GRANT SELECT ON public.track_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.track_likes TO authenticated;
GRANT ALL ON public.track_likes TO service_role;

ALTER TABLE public.track_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read track likes"
ON public.track_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated can like"
ON public.track_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own"
ON public.track_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- SOCIAL WALL (posts)
-- ---------------------------------------------------------------------
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  mentions text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX posts_created_idx ON public.posts(created_at DESC);

GRANT SELECT ON public.posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read posts"
ON public.posts FOR SELECT USING (true);

CREATE POLICY "Authenticated can post"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Owner can update own post"
ON public.posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Owner or admin can delete post"
ON public.posts FOR DELETE
TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

-- Gamification: +2 pts on new post
CREATE OR REPLACE FUNCTION public.trg_points_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_points(NEW.author_id, 'post', 2);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_post_created AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_post();

-- Enable realtime on posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- ---------------------------------------------------------------------
-- PODCASTS / EPISODES / RATINGS
-- ---------------------------------------------------------------------
CREATE TABLE public.podcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.podcasts TO anon, authenticated;
GRANT ALL ON public.podcasts TO service_role;
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read podcasts" ON public.podcasts FOR SELECT USING (true);
CREATE POLICY "Admins manage podcasts" ON public.podcasts FOR ALL
TO authenticated USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id uuid NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  title text NOT NULL,
  audio_url text NOT NULL,
  duration_seconds int,
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX episodes_podcast_idx ON public.episodes(podcast_id, published_at DESC);

GRANT SELECT ON public.episodes TO anon, authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read episodes" ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Admins manage episodes" ON public.episodes FOR ALL
TO authenticated USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.episode_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(episode_id, user_id)
);

GRANT SELECT ON public.episode_ratings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.episode_ratings TO authenticated;
GRANT ALL ON public.episode_ratings TO service_role;
ALTER TABLE public.episode_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ratings" ON public.episode_ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated can rate" ON public.episode_ratings FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update rating" ON public.episode_ratings FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can delete rating" ON public.episode_ratings FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- SHOWS (émissions / chroniques / animateurs)
-- ---------------------------------------------------------------------
CREATE TABLE public.shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('emission','chronique','animateur')),
  title text NOT NULL,
  cover_url text,
  description text,
  schedule text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shows TO anon, authenticated;
GRANT ALL ON public.shows TO service_role;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read shows" ON public.shows FOR SELECT USING (true);
CREATE POLICY "Admins manage shows" ON public.shows FOR ALL
TO authenticated USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------------------------------------------------------------------
-- REQUESTS (dédicaces)
-- ---------------------------------------------------------------------
CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_requested text,
  dedication_message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','played','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX requests_status_idx ON public.requests(status, created_at DESC);

GRANT SELECT ON public.requests TO authenticated;
GRANT INSERT ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own requests" ON public.requests FOR SELECT
TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Admins/animateurs read all requests" ON public.requests FOR SELECT
TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'animateur'));
CREATE POLICY "Authenticated can create request" ON public.requests FOR INSERT
TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Admins/animateurs update request status" ON public.requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'animateur'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'animateur'));

CREATE OR REPLACE FUNCTION public.trg_points_on_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_points(NEW.author_id, 'dedicace', 1);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_request_created AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_request();

-- ---------------------------------------------------------------------
-- NEWSLETTER
-- ---------------------------------------------------------------------
CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  subscribed_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT SELECT ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT
TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read subscribers" ON public.newsletter_subscribers FOR SELECT
TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ---------------------------------------------------------------------
-- INDI RÉZO (news_posts, news_likes, news_comments)
-- ---------------------------------------------------------------------
CREATE TABLE public.news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX news_posts_created_idx ON public.news_posts(created_at DESC);

GRANT SELECT ON public.news_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.news_posts TO authenticated;
GRANT ALL ON public.news_posts TO service_role;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read news" ON public.news_posts FOR SELECT USING (true);
CREATE POLICY "Admins and animateurs can publish news" ON public.news_posts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'animateur'))
);
CREATE POLICY "Owner or admin updates news" ON public.news_posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'))
WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin deletes news" ON public.news_posts FOR DELETE
TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.news_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_post_id uuid NOT NULL REFERENCES public.news_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(news_post_id, user_id)
);

CREATE INDEX news_likes_post_idx ON public.news_likes(news_post_id);

GRANT SELECT ON public.news_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.news_likes TO authenticated;
GRANT ALL ON public.news_likes TO service_role;
ALTER TABLE public.news_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read news likes" ON public.news_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated can like news" ON public.news_likes FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can unlike news" ON public.news_likes FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Trigger: +1 pt to news_post author when they get a like
CREATE OR REPLACE FUNCTION public.trg_points_on_news_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_author uuid;
BEGIN
  SELECT author_id INTO v_author FROM public.news_posts WHERE id = NEW.news_post_id;
  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    PERFORM public.award_points(v_author, 'like_received', 1);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_news_like_created AFTER INSERT ON public.news_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_news_like();

CREATE TABLE public.news_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_post_id uuid NOT NULL REFERENCES public.news_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX news_comments_post_idx ON public.news_comments(news_post_id, created_at);

GRANT SELECT ON public.news_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.news_comments TO authenticated;
GRANT ALL ON public.news_comments TO service_role;
ALTER TABLE public.news_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comments" ON public.news_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated can comment" ON public.news_comments FOR INSERT
TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owner can update comment" ON public.news_comments FOR UPDATE
TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owner or admin can delete comment" ON public.news_comments FOR DELETE
TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.trg_points_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_points(NEW.author_id, 'comment', 1);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_news_comment_created AFTER INSERT ON public.news_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_comment();

-- ---------------------------------------------------------------------
-- CHART VIEWS
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.chart_week AS
SELECT t.id, t.title, t.artist, COUNT(l.id)::int AS likes
FROM public.track_history t
LEFT JOIN public.track_likes l ON l.track_history_id = t.id
WHERE t.played_at >= now() - interval '7 days'
GROUP BY t.id
ORDER BY likes DESC, t.played_at DESC
LIMIT 10;

CREATE OR REPLACE VIEW public.chart_all_time AS
SELECT t.id, t.title, t.artist, COUNT(l.id)::int AS likes
FROM public.track_history t
LEFT JOIN public.track_likes l ON l.track_history_id = t.id
GROUP BY t.id
ORDER BY likes DESC, t.played_at DESC
LIMIT 10;

GRANT SELECT ON public.chart_week TO anon, authenticated;
GRANT SELECT ON public.chart_all_time TO anon, authenticated;
