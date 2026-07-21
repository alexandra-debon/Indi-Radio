
CREATE TABLE public.coup_de_coeur_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coup_id UUID NOT NULL REFERENCES public.coups_de_coeur(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coup_id, user_id)
);

CREATE INDEX idx_coup_de_coeur_likes_coup ON public.coup_de_coeur_likes(coup_id);
CREATE INDEX idx_coup_de_coeur_likes_user ON public.coup_de_coeur_likes(user_id);

GRANT SELECT ON public.coup_de_coeur_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.coup_de_coeur_likes TO authenticated;
GRANT ALL ON public.coup_de_coeur_likes TO service_role;

ALTER TABLE public.coup_de_coeur_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone"
  ON public.coup_de_coeur_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like when authenticated"
  ON public.coup_de_coeur_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own like"
  ON public.coup_de_coeur_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
