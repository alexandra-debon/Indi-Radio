-- Enable realtime broadcasting for comments and reactions used across public pages
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_ratings;