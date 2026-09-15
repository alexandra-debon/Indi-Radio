-- 1. Profils : bannière + couleur d'accent
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accent_color text;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_accent_color_hex
  CHECK (accent_color IS NULL OR accent_color ~* '^#[0-9a-f]{6}$') NOT VALID;

-- 2. Posts : choix de diffusion
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'feed';
ALTER TABLE public.posts
  ADD CONSTRAINT posts_visibility_check
  CHECK (visibility IN ('feed', 'profile_only')) NOT VALID;
CREATE INDEX IF NOT EXISTS posts_visibility_created_idx ON public.posts (visibility, created_at DESC);

-- 3. Dates de concert
CREATE TABLE IF NOT EXISTS public.artist_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_date date NOT NULL,
  venue text,
  ticket_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS artist_events_artist_date_idx ON public.artist_events (artist_id, event_date DESC);

GRANT SELECT ON public.artist_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_events TO authenticated;
GRANT ALL ON public.artist_events TO service_role;

ALTER TABLE public.artist_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_events_public_read" ON public.artist_events
  FOR SELECT USING (true);
CREATE POLICY "artist_events_owner_insert" ON public.artist_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "artist_events_owner_update" ON public.artist_events
  FOR UPDATE TO authenticated USING (auth.uid() = artist_id) WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "artist_events_owner_delete" ON public.artist_events
  FOR DELETE TO authenticated USING (auth.uid() = artist_id OR public.has_role(auth.uid(), 'admin'));

-- 4. Abonnements aux pages artistes
CREATE TABLE IF NOT EXISTS public.artist_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, artist_id)
);
CREATE INDEX IF NOT EXISTS artist_follows_artist_idx ON public.artist_follows (artist_id);

GRANT SELECT ON public.artist_follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.artist_follows TO authenticated;
GRANT ALL ON public.artist_follows TO service_role;

ALTER TABLE public.artist_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_follows_public_read" ON public.artist_follows
  FOR SELECT USING (true);
CREATE POLICY "artist_follows_own_insert" ON public.artist_follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id AND follower_id <> artist_id);
CREATE POLICY "artist_follows_own_delete" ON public.artist_follows
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- 5. Notification aux abonnés lors d'une nouvelle publication
CREATE OR REPLACE FUNCTION public.trg_notify_artist_followers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
BEGIN
  SELECT COALESCE(NULLIF(stage_name, ''), pseudo) INTO v_name
  FROM public.profiles WHERE id = NEW.author_id;
  IF v_name IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  SELECT f.follower_id, NEW.author_id, 'artist_post',
         v_name || ' a publié une nouveauté',
         '/p/' || NEW.id::text
  FROM public.artist_follows f
  WHERE f.artist_id = NEW.author_id
    AND f.follower_id <> NEW.author_id;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_artist_followers ON public.posts;
CREATE TRIGGER notify_artist_followers
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_artist_followers();
