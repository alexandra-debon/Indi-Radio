
ALTER TABLE public.coups_de_coeur
  ADD COLUMN IF NOT EXISTS editorial_rating SMALLINT
  CHECK (editorial_rating IS NULL OR (editorial_rating BETWEEN 0 AND 5));
