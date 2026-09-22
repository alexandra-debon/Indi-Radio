-- 1. Élargir les signalements aux contenus eux-mêmes (pas seulement les commentaires)
ALTER TABLE public.comment_reports DROP CONSTRAINT IF EXISTS comment_reports_comment_type_check;
ALTER TABLE public.comment_reports
  ADD CONSTRAINT comment_reports_comment_type_check
  CHECK (comment_type IN (
    'content_comment','news_comment','post_comment',
    'post','village_post','teevi_video','profile','shop_item'
  ));

-- 2. Blocage d'un utilisateur par un autre utilisateur (exigence App Store 1.2)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own blocks" ON public.user_blocks;
CREATE POLICY "Users read their own blocks"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users create their own blocks" ON public.user_blocks;
CREATE POLICY "Users create their own blocks"
  ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users remove their own blocks" ON public.user_blocks;
CREATE POLICY "Users remove their own blocks"
  ON public.user_blocks FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON public.user_blocks(blocker_id);