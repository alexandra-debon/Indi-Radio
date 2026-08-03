CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.unschedule('ping-sitemaps-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ping-sitemaps-daily');
SELECT cron.schedule(
  'ping-sitemaps-daily',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://radio.indi-art-culture.com/api/public/hooks/ping-sitemaps',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcW1lanN2anBncHZmaWFubmhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMTI2NzIsImV4cCI6MjA5OTU4ODY3Mn0.sjMrdtPvWeVrpIhuqpYOqDmREXMuHNXC71Oy2A8yFo8"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);