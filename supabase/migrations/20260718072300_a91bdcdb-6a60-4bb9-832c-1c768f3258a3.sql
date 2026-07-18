ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comment_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_comment_likes;
ALTER TABLE public.post_comment_likes REPLICA IDENTITY FULL;
ALTER TABLE public.news_comment_likes REPLICA IDENTITY FULL;