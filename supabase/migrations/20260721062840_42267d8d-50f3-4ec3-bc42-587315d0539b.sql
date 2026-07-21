ALTER TABLE public.point_events REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.point_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;