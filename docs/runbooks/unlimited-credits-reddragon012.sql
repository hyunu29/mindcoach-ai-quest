-- ──────────────────────────────────────────────────────────────
-- reddragon012@naver.com 계정 AI 크레딧 무한 부여 (일회성 운영 작업)
-- 실행 위치: Supabase Dashboard → SQL Editor (bpkz 프로젝트)
-- 작성: 2026-06-24
-- ──────────────────────────────────────────────────────────────
--
-- 동작 원리:
--   user_credits 테이블에 (granted=10억, used=0, period_end=2099) row 1개를 추가.
--   consume_ai_credit RPC가 period_end > now()인 가장 최신 row를 자동 선택하므로
--   기존 row를 만지지 않아도 이 row가 우선 소비됨.
--
-- 검증 순서:
--   1) BEFORE: SELECT 쿼리 실행 → 해당 user_id 확인 + 기존 잔액 확인
--   2) INSERT 실행 → RETURNING 결과로 적용됨 확인
--   3) AFTER: 동일 SELECT 재실행 → admin_unlimited row 잔액 999,999,999 확인
-- ──────────────────────────────────────────────────────────────

-- BEFORE 검증 ─────────────────────────────────────
SELECT
  u.id AS user_id,
  u.email,
  COALESCE(SUM(c.credits_granted - c.credits_used), 0) AS current_remaining
FROM auth.users u
LEFT JOIN public.user_credits c
  ON c.user_id = u.id AND c.period_end > now()
WHERE u.email = 'reddragon012@naver.com'
GROUP BY u.id, u.email;

-- INSERT (실제 적용) ──────────────────────────────
INSERT INTO public.user_credits (
  user_id, period_start, period_end, credits_granted, credits_used, source
)
SELECT
  id,
  now(),
  '2099-12-31 23:59:59+00'::timestamptz,
  1000000000,
  0,
  'admin_unlimited'
FROM auth.users
WHERE email = 'reddragon012@naver.com'
RETURNING user_id, credits_granted, period_end, source;

-- AFTER 검증 ──────────────────────────────────────
SELECT
  u.id AS user_id,
  u.email,
  c.source,
  c.credits_granted - c.credits_used AS remaining,
  c.period_end
FROM auth.users u
JOIN public.user_credits c ON c.user_id = u.id
WHERE u.email = 'reddragon012@naver.com'
ORDER BY c.period_end DESC;

-- ──────────────────────────────────────────────────────────────
-- 롤백 (필요 시):
-- DELETE FROM public.user_credits
-- WHERE source = 'admin_unlimited'
--   AND user_id = (SELECT id FROM auth.users WHERE email = 'reddragon012@naver.com');
-- ──────────────────────────────────────────────────────────────
