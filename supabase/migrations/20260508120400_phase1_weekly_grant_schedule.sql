-- Phase 1 P1.5: weekly-grant Edge Function pg_cron 스케줄
-- 매주 토요일 15:00 UTC = 일요일 00:00 KST 트리거.
-- CRON_SECRET 값은 super_admin이 SQL Editor에서 1회 설정:
--   ALTER DATABASE postgres SET app.cron_secret = '<같은 값으로 Edge Function env에도 설정>';

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 기존 스케줄 제거 (멱등). 없으면 NULL 반환, 에러 없음.
DO $$
BEGIN
  PERFORM cron.unschedule('weekly-grant-sunday-kst');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'weekly-grant-sunday-kst',
  '0 15 * * 6',  -- 토요일 15:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://bnhnaaarsyauppdbrbco.supabase.co/functions/v1/weekly-grant',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    timeout_milliseconds := 30000
  );
  $$
);
