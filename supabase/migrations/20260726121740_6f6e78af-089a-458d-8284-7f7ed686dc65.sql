ALTER TABLE public.broadcast_partners REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_partners;