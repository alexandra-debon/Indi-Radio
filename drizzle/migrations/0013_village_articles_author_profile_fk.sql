ALTER TABLE public.village_articles
  ADD CONSTRAINT village_articles_author_id_profiles_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;