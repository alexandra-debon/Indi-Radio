-- Bloc 5 : badges administrables, points RéDaK'Village, challenges éditoriaux

-- 1. Définitions de badges (attribués via profiles.badges, admin-only)
CREATE TABLE public.badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label_fr text NOT NULL,
  label_en text,
  icon text NOT NULL DEFAULT 'award',
  color text NOT NULL DEFAULT '#f5c518',
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT badge_definitions_color_hex CHECK (color ~* '^#[0-9a-f]{6}$'),
  CONSTRAINT badge_definitions_key_len CHECK (char_length(key) BETWEEN 1 AND 40)
);

GRANT SELECT ON public.badge_definitions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badge_definitions TO authenticated;
GRANT ALL ON public.badge_definitions TO service_role;

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badge_definitions_public_read" ON public.badge_definitions
  FOR SELECT USING (true);
CREATE POLICY "badge_definitions_admin_insert" ON public.badge_definitions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "badge_definitions_admin_update" ON public.badge_definitions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "badge_definitions_admin_delete" ON public.badge_definitions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_touch_badge_definitions
BEFORE UPDATE ON public.badge_definitions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 2. Challenges éditoriaux (admin-only en écriture, lecture publique)
CREATE TABLE public.editorial_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX editorial_challenges_active_idx ON public.editorial_challenges (is_active, created_at DESC);

GRANT SELECT ON public.editorial_challenges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_challenges TO authenticated;
GRANT ALL ON public.editorial_challenges TO service_role;

ALTER TABLE public.editorial_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_public_read" ON public.editorial_challenges
  FOR SELECT USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "challenges_admin_insert" ON public.editorial_challenges
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "challenges_admin_update" ON public.editorial_challenges
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "challenges_admin_delete" ON public.editorial_challenges
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_touch_editorial_challenges
BEFORE UPDATE ON public.editorial_challenges
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 3. Réponse à un challenge : lien depuis les articles du Village
ALTER TABLE public.village_articles
  ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES public.editorial_challenges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS village_articles_challenge_idx ON public.village_articles (challenge_id);

GRANT SELECT (challenge_id) ON public.village_articles TO anon;
GRANT SELECT (challenge_id), INSERT (challenge_id), UPDATE (challenge_id)
  ON public.village_articles TO authenticated;

-- 4. Points : les articles du Village comptent dans le système existant
CREATE OR REPLACE FUNCTION public.trg_points_on_village_article()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.published THEN
    PERFORM public.award_points(NEW.author_id, 'village_article', 3);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS points_on_village_article ON public.village_articles;
CREATE TRIGGER points_on_village_article
AFTER INSERT ON public.village_articles
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_village_article();

CREATE OR REPLACE FUNCTION public.trg_points_on_village_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_author uuid;
BEGIN
  IF NEW.content_type <> 'village_article' THEN
    RETURN NEW;
  END IF;
  SELECT author_id INTO v_author FROM public.village_articles WHERE id = NEW.content_id;
  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    PERFORM public.award_points(v_author, 'like_received', 1);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS points_on_village_like ON public.content_likes;
CREATE TRIGGER points_on_village_like
AFTER INSERT ON public.content_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_points_on_village_like();