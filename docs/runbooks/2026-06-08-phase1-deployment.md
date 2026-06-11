# Phase 1 배포 실행 가이드 (Task 9)

> 신현우 본인이 한 단계씩 수동으로 실행할 절차. Claude 세션에서 자동 배포가 막혔기 때문에 사람이 운전.
>
> 전제: `phase1-auth-cleancut` 브랜치에 P1.1~P1.5 + P1.7 커밋 모두 들어가 있음. 미커밋 변경 없음.

---

## 0. 사전 점검 (5분)

```bash
cd "C:/Users/ricky/Desktop/mindcoach-ai-quest"
git status                # clean 확인
git log --oneline -10     # P1.x 커밋 보이는지 확인
npm run build             # PASS 재확인
```

Lovable Editor 열어서 현재 main이 살아있는 상태인지 확인 (배포 직전 baseline).

---

## 1. CRON_SECRET 생성 + 등록 (10분)

### 1-1. 시크릿 값 생성

PowerShell:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ }))
```
또는 macOS/WSL:
```bash
openssl rand -base64 32
```
출력값을 메모. 두 군데에 **동일하게** 넣을 것이므로 한 번만 생성.

### 1-2. Supabase Edge Function env 등록

Supabase Dashboard → Project Settings → Edge Functions → "Add new secret":
- Name: `CRON_SECRET`
- Value: 위에서 생성한 값

### 1-3. Supabase Vault에 시크릿 등록

(`ALTER DATABASE`는 Supabase에서 권한 막혀 있음. Vault가 표준.)

Supabase Dashboard → SQL Editor:
```sql
SELECT vault.create_secret('여기에_같은_값_붙여넣기', 'cron_secret');
```
이미 등록되어 있으면 UNIQUE constraint 에러 — 그때는 갱신:
```sql
UPDATE vault.secrets
   SET secret = '여기에_같은_값_붙여넣기'
 WHERE name = 'cron_secret';
```

### 1-4. 검증

```sql
SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret';
-- 위에서 넣은 값이 그대로 출력되어야 함
```

---

## 2. 마이그레이션 원격 적용 (10분)

이미 main에 `20260508120000~20260508120400` 마이그레이션 파일이 있음. 원격에 적용:

```bash
cd "C:/Users/ricky/Desktop/mindcoach-ai-quest"
npx supabase login            # 처음이면 1회
npx supabase link --project-ref bnhnaaarsyauppdbrbco
npx supabase db push          # 미적용 마이그레이션 일괄 적용
```

확인:
```sql
SELECT version, name FROM supabase_migrations.schema_migrations
 ORDER BY version DESC LIMIT 8;
```
Expected: `20260508120000`, `20260508120100`, `20260508120200`(주석 only), `20260508120300`, `20260508120400` 모두 보임.

---

## 3. weekly-grant Edge Function 배포 (5분)

```bash
npx supabase functions deploy weekly-grant --no-verify-jwt
```

`config.toml`에 이미 `verify_jwt = false`로 설정되어 있어 `--no-verify-jwt` 플래그 없어도 됨. 양쪽 다 같은 결과.

Dashboard → Edge Functions에서 `weekly-grant` Active 확인.

---

## 4. weekly-grant 수동 호출 검증 (5분)

### 4-1. HTTPS 호출

PowerShell:
```powershell
$secret = "1-1에서_생성한_값"
Invoke-RestMethod -Method POST `
  -Uri "https://bnhnaaarsyauppdbrbco.supabase.co/functions/v1/weekly-grant" `
  -Headers @{ "x-cron-secret" = $secret; "Content-Type" = "application/json" }
```
Expected: `{ ok = True; granted = 0 }` (현재 Pro 사용자 0명).

### 4-2. 잘못된 시크릿 거부 확인

```powershell
Invoke-RestMethod -Method POST `
  -Uri "https://bnhnaaarsyauppdbrbco.supabase.co/functions/v1/weekly-grant" `
  -Headers @{ "x-cron-secret" = "wrong"; "Content-Type" = "application/json" }
```
Expected: HTTP 403, `{ error = "FORBIDDEN" }`.

### 4-3. RPC 멱등성 직접 검증

SQL Editor:
```sql
SELECT * FROM public.grant_weekly_pro_benefits();  -- granted_count = 0 (Pro 없음)
SELECT * FROM public.grant_weekly_pro_benefits();  -- 0 (idempotent)
```

---

## 5. pg_cron 스케줄 등록 확인 (3분)

```sql
SELECT jobid, schedule, command, active
  FROM cron.job
 WHERE jobname = 'weekly-grant-sunday-kst';
```
Expected: 1행, `schedule = '0 15 * * 6'`, `active = t`.

다음 트리거 시간 확인:
```sql
SELECT jobname, schedule, next_run
  FROM cron.job_run_details_view  -- (없으면 cron.job에서 schedule만)
 WHERE jobname = 'weekly-grant-sunday-kst'
 ORDER BY 1 DESC LIMIT 5;
```

---

## 6. 기존 사용자 클린컷 (선택, Task 7 결제 활성화 후로 미루는 것 권장)

⚠️ **현재는 스킵 권장.** Task 7 (Toss 결제) 활성화 전에 클린컷하면 본인 1명 + 김종환 코치 데이터만 남는데, 그 상태에서 Pro 결제 흐름 검증을 할 수 없음 (결제 코드 자체가 미배포). Toss 빌링키 발급이 가능해진 시점에 클린컷 + 결제 골든패스를 한 번에 검증하는 것이 합리.

실행할 때는 `docs/runbooks/2026-05-08-cleancut.md` 참조.

---

## 7. 브랜치 main 머지 + Lovable publish (10분)

```bash
git checkout phase1-auth-cleancut
git push origin phase1-auth-cleancut
```

GitHub에서 PR → main 머지. 머지 후:

1. Lovable Editor에서 자동 sync 대기 (~30초)
2. `src/integrations/supabase/client.ts` 열어서 Supabase URL/anon key 폴백 하드코딩이 살아있는지 확인. 사라졌으면 즉시 재커밋 (memory `project_lovable_deployment.md` 참조)
3. Lovable Editor에서 "Publish" 클릭
4. 시크릿 창에서 `https://mindcoach-ai-quest.lovable.app/auth` 진입
5. 카카오 로그인 → onboarding 통과 → dashboard 도착 확인

---

## 8. 골든패스 E2E (Pro 결제 제외) (10분)

본인 카카오 계정으로:

1. `/auth` → 카카오 버튼 → 인증 → `/auth/callback` → `/onboarding` 도달
2. 닉네임/학년 입력 → `/dashboard` 도달
3. `/tests` 진입 → 무료 통합검사(INT) 1회 응시 → 결과 페이지
4. `/coaching` 진입 → AI 메시지 1회 전송 → `consume_ai_credit` 호출 확인

검증 SQL:
```sql
SELECT id, user_type, onboarded_at FROM public.profiles WHERE id = '<my-uid>';
SELECT source, credits_granted, credits_used FROM public.user_credits WHERE user_id = '<my-uid>';
-- Expected: source='free_signup', credits_granted=10, credits_used=1
```

---

## 9. advisor 점검

Dashboard → Advisors 또는 SQL:
- Security advisors: 새 RPC `grant_weekly_pro_benefits`에 RLS/SECURITY DEFINER 경고 있는지 확인 (SECURITY DEFINER는 의도된 것, function_search_path 경고는 이미 `SET search_path = public`로 처리됨)
- Performance advisors: 새 인덱스 누락 경고 있으면 검토 (`profiles.user_type` 인덱스는 마이그레이션에서 추가됨)

---

## 10. 완료 보고서

`docs/plans/2026-06-08-phase1-partial-completion.md` 작성:
- 적용된 변경: Kakao OAuth 단독, weekly grant 인프라, ProtectedRoute 가드
- 미적용 (Task 7 대기): Toss 정기결제, 클린컷
- Phase 2 (B2B) 시작 가능 시점 메모

---

## 트러블슈팅

| 증상 | 원인 | 대응 |
|---|---|---|
| `db push` 실패: migration already applied | 일부만 적용된 상태 | Dashboard SQL Editor에서 미적용 파일만 수동 실행 |
| weekly-grant 호출 시 500 `grant_weekly_pro_benefits not found` | RPC 마이그레이션 미적용 | 2번 단계 확인 |
| pg_cron 스케줄에서 `current_setting` NULL | `ALTER DATABASE` 후 cron job이 이전 세션 캐시 | `SELECT pg_reload_conf();` 후 다음 실행 대기 또는 `SELECT cron.alter_job()` |
| Lovable에서 카카오 로그인 503 | Kakao OAuth provider 미설정 | 사전 조건 1번 (Phase 1 plan §사전 조건) 확인 |
