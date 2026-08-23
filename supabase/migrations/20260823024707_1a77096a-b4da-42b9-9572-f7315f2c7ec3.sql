-- 1. PLANIFICATION DES ARTICLES ------------------------------------------
ALTER TABLE public.news_posts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE INDEX IF NOT EXISTS news_posts_scheduled_at_idx ON public.news_posts (scheduled_at);

DROP POLICY IF EXISTS "Anyone can read news" ON public.news_posts;
CREATE POLICY "Anyone can read news"
ON public.news_posts FOR SELECT
USING (
  ((NOT is_quarantined(author_id)) OR (auth.uid() = author_id) OR has_role(auth.uid(), 'admin'::app_role))
  AND (
    scheduled_at IS NULL
    OR scheduled_at <= now()
    OR auth.uid() = author_id
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2. INVITATIONS D'AUTEURS PAR EMAIL ---------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_author_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_author_invites_status_check CHECK (status IN ('pending','accepted','revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_author_invites_pending_email_idx
  ON public.blog_author_invites (lower(email)) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_author_invites TO authenticated;
GRANT ALL ON public.blog_author_invites TO service_role;

ALTER TABLE public.blog_author_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blog invites"
ON public.blog_author_invites FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER blog_author_invites_touch
BEFORE UPDATE ON public.blog_author_invites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 3. MODÉRATION DES COMMENTAIRES -------------------------------------------
ALTER TABLE public.news_comments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderated_by uuid,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_note text;

ALTER TABLE public.news_comments
  DROP CONSTRAINT IF EXISTS news_comments_status_check;
ALTER TABLE public.news_comments
  ADD CONSTRAINT news_comments_status_check CHECK (status IN ('approved','hidden'));

DROP POLICY IF EXISTS "Anyone can read comments" ON public.news_comments;
CREATE POLICY "Anyone can read comments"
ON public.news_comments FOR SELECT
USING (
  ((NOT is_quarantined(author_id)) OR (auth.uid() = author_id) OR has_role(auth.uid(), 'admin'::app_role))
  AND (
    status = 'approved'
    OR auth.uid() = author_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR can_publish_news(auth.uid())
  )
);

DROP POLICY IF EXISTS "Owner or admin can delete comment" ON public.news_comments;
CREATE POLICY "Owner admin or blog moderator deletes comment"
ON public.news_comments FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR can_publish_news(auth.uid())
);

CREATE POLICY "Blog moderators can moderate comments"
ON public.news_comments FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR can_publish_news(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR can_publish_news(auth.uid()));

-- Un modérateur qui n'est pas l'auteur ne peut changer que l'état de modération.
CREATE OR REPLACE FUNCTION public.restrict_comment_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM OLD.author_id THEN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.image_urls IS DISTINCT FROM OLD.image_urls
       OR NEW.image_captions IS DISTINCT FROM OLD.image_captions
       OR NEW.author_id IS DISTINCT FROM OLD.author_id
       OR NEW.news_post_id IS DISTINCT FROM OLD.news_post_id THEN
      RAISE EXCEPTION 'Un modérateur ne peut modifier que l''état de modération';
    END IF;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.moderated_by := auth.uid();
    NEW.moderated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_comment_moderation_fields ON public.news_comments;
CREATE TRIGGER restrict_comment_moderation_fields
BEFORE UPDATE ON public.news_comments
FOR EACH ROW EXECUTE FUNCTION public.restrict_comment_moderation_fields();

-- 4. HISTORIQUE DES VERSIONS D'ARTICLE -------------------------------------
CREATE TABLE IF NOT EXISTS public.news_post_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_post_id uuid NOT NULL REFERENCES public.news_posts(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  image_urls text[] NOT NULL DEFAULT '{}',
  image_captions text[] NOT NULL DEFAULT '{}',
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  embed_url text,
  embed_height integer,
  scheduled_at timestamptz,
  edited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_post_revisions_post_idx
  ON public.news_post_revisions (news_post_id, created_at DESC);

GRANT SELECT ON public.news_post_revisions TO authenticated;
GRANT ALL ON public.news_post_revisions TO service_role;

ALTER TABLE public.news_post_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and post authors read revisions"
ON public.news_post_revisions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.news_posts p
    WHERE p.id = news_post_revisions.news_post_id AND p.author_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.snapshot_news_post_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.image_url IS DISTINCT FROM OLD.image_url
     OR NEW.image_urls IS DISTINCT FROM OLD.image_urls
     OR NEW.image_captions IS DISTINCT FROM OLD.image_captions
     OR NEW.social_links IS DISTINCT FROM OLD.social_links
     OR NEW.embed_url IS DISTINCT FROM OLD.embed_url
     OR NEW.embed_height IS DISTINCT FROM OLD.embed_height
     OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
    INSERT INTO public.news_post_revisions (
      news_post_id, title, content, image_url, image_urls, image_captions,
      social_links, embed_url, embed_height, scheduled_at, edited_by
    ) VALUES (
      OLD.id, OLD.title, OLD.content, OLD.image_url, OLD.image_urls, OLD.image_captions,
      OLD.social_links, OLD.embed_url, OLD.embed_height, OLD.scheduled_at, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_news_post_revision ON public.news_posts;
CREATE TRIGGER snapshot_news_post_revision
BEFORE UPDATE ON public.news_posts
FOR EACH ROW EXECUTE FUNCTION public.snapshot_news_post_revision();