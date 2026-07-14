-- Add missing foreign keys so PostgREST embeds work
ALTER TABLE public.post_comments
  ADD CONSTRAINT post_comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.post_likes
  ADD CONSTRAINT post_likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;