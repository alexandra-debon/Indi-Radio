-- Rattrapage / état des lieux idempotent du schéma des Blocs 1 à 5.
-- Reproduit fidèlement le schéma live pour que le projet soit reconstructible
-- depuis les migrations versionnées seules.

-- 1. Profils : demande de rôle, page artiste, sections
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_requested public.app_role,
  ADD COLUMN IF NOT EXISTS role_request_status text,
  ADD COLUMN IF NOT EXISTS role_request_note text,
  ADD COLUMN IF NOT EXISTS role_request_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS role_request_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS punchline text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS show_events_section boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_shop_section boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_posts_section boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_request_status_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_request_status_check
      CHECK (role_request_status IS NULL OR role_request_status IN ('pending','approved','rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_accent_color_hex') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_accent_color_hex
      CHECK (accent_color IS NULL OR accent_color ~* '^#[0-9a-f]{6}$') NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_role_request_status_idx
  ON public.profiles (role_request_status) WHERE role_request_status = 'pending';

GRANT SELECT (punchline, banner_url, accent_color,
              show_events_section, show_shop_section, show_posts_section)
  ON public.profiles TO anon;
GRANT SELECT (punchline, banner_url, accent_color,
              show_events_section, show_shop_section, show_posts_section,
              role_requested, role_request_status, role_request_note,
              role_request_submitted_at, role_request_reviewed_at)
  ON public.profiles TO authenticated;
GRANT UPDATE (punchline, banner_url, accent_color,
              show_events_section, show_shop_section, show_posts_section,
              role_requested, role_request_status, role_request_note,
              role_request_submitted_at, role_request_reviewed_at)
  ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2. Publications : diffusion, catégorie, vignette de partage
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'feed',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS og_image_url text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_visibility_check') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_visibility_check
      CHECK (visibility IN ('feed','profile_only','followers_only')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_category_check') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_category_check
      CHECK (category IS NULL OR category IN ('musique','livre','art'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS posts_visibility_created_idx ON public.posts (visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_category_idx ON public.posts (category) WHERE category IS NOT NULL;

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

-- 3. Tables liées des Blocs 2 et 3 (droits au niveau table)
GRANT SELECT ON public.artist_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_events TO authenticated;
GRANT ALL ON public.artist_events TO service_role;

GRANT SELECT ON public.artist_follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.artist_follows TO authenticated;
GRANT ALL ON public.artist_follows TO service_role;

GRANT SELECT ON public.artist_shop_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_shop_items TO authenticated;
GRANT ALL ON public.artist_shop_items TO service_role;

-- 4. Bloc 5 : RéDaK'Village
GRANT SELECT ON public.village_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.village_articles TO authenticated;
GRANT ALL ON public.village_articles TO service_role;

GRANT SELECT, INSERT, DELETE ON public.village_subscriptions TO authenticated;
GRANT ALL ON public.village_subscriptions TO service_role;

GRANT SELECT ON public.magazine_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.magazine_entries TO authenticated;
GRANT ALL ON public.magazine_entries TO service_role;