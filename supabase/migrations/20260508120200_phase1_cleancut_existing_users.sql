-- WARNING: 이 마이그레이션은 자동 실행하지 말 것.
-- super_admin이 Supabase SQL Editor에서 수동 1회 실행.
-- 사전에 Supabase Dashboard → Database → Backups 에서 매뉴얼 백업 트리거.

-- 1. 클린컷 대상 카운트 (사전 확인)
-- SELECT count(*) FROM auth.users;

-- 2. cascade 삭제 (auth.users → profiles, user_credits, user_subscriptions, test_results 등 모두 ON DELETE CASCADE)
-- DELETE FROM auth.users;

-- 3. 검증
-- SELECT count(*) FROM auth.users;                        -- 0
-- SELECT count(*) FROM public.profiles;                   -- 0
-- SELECT count(*) FROM public.user_subscriptions;         -- 0
-- SELECT count(*) FROM public.user_credits;               -- 0
-- SELECT count(*) FROM public.test_results;               -- 0

-- (주석으로만 두는 이유: 마이그레이션이 PR/배포에 자동 실행되면 prod 데이터 다 날아감.
--  super_admin이 의도적으로 한 번만 SQL Editor에서 실행해야 안전.)
