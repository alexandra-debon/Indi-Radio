CREATE OR REPLACE VIEW public.chart_week AS
SELECT
  t.id,
  t.title,
  t.artist,
  count(l.id)::integer AS likes
FROM public.track_history t
LEFT JOIN public.track_likes l ON l.track_history_id = t.id
WHERE t.played_at >= (now() - interval '7 days')
GROUP BY t.id
ORDER BY count(l.id)::integer DESC, t.played_at DESC
LIMIT 25;

CREATE OR REPLACE VIEW public.chart_all_time AS
SELECT
  t.id,
  t.title,
  t.artist,
  count(l.id)::integer AS likes
FROM public.track_history t
LEFT JOIN public.track_likes l ON l.track_history_id = t.id
GROUP BY t.id
ORDER BY count(l.id)::integer DESC, t.played_at DESC
LIMIT 25;