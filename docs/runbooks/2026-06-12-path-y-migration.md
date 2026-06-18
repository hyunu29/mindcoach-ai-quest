# Path Y 마이그레이션: Lovable Cloud → 외부 Supabase + Vercel (2026-06-12)

**배경:** Lovable Cloud 관리형 인증은 Google/Apple만 지원 → 카카오 로그인 불가. 외부 Supabase + Vercel 스택으로 이전.

**브랜치:** `vercel-migration` (main에 머지하지 않음, 검증 완료 후 cut-over)
**새 Supabase 프로젝트:** `bpkzljeplyqvbmwwomom` (계정: `ricky012941@gmail.com`)
**기존 라이브:** `https://mindcoach-ai-quest.lovable.app` (검증 끝날 때까지 유지)

---

## 0. 진행 순서 (TL;DR)

1. **Supabase**: 23개 마이그레이션 적용 → 카카오 Auth Provider 등록 → Edge Function 시크릿 등록
2. **카카오 콘솔**: Redirect URI 갱신 (새 Supabase callback URL)
3. **Edge Function 배포**: 4개 함수 (chat-coaching, create-payment-order, verify-payment, weekly-grant)
4. **Vercel**: 프로젝트 생성 → 환경변수 등록 → preview 배포
5. **검증**: preview URL에서 전체 플로우 통과 확인
6. **Cut-over**: `vercel-migration` → `main` 머지 → DNS 전환

---

## 1. 새 Supabase 프로젝트 셋업

### 1-1. 마이그레이션 적용

`supabase/migrations/` 디렉토리의 23개 SQL을 새 프로젝트에 순서대로 적용합니다.

**옵션 A — Supabase CLI (권장):**
```bash
cd C:\Users\ricky\Desktop\mindcoach-ai-quest
supabase link --project-ref bpkzljeplyqvbmwwomom
supabase db push
```
(`supabase login` 필요. access token은 콘솔에서 발급)

**옵션 B — 콘솔에서 수동 적용:**
- Supabase Dashboard → SQL Editor에 각 파일 내용 붙여넣고 순서대로 실행
- 파일명 순서 (UTC timestamp prefix 오름차순) 그대로

**검증:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- profiles, syndromes, tests, test_attempts, analytics_events, ... 모두 존재 확인

SELECT * FROM storage.buckets WHERE id = 'character-assets';
-- 1행 (public=true) 확인
```

### 1-2. 카카오 Auth Provider 등록

**Authentication → Providers → Kakao**:
1. **Enable Sign in with Kakao** ON
2. **Kakao Client ID**: 기존 REST API 키 (Kakao Developers 콘솔에서 복사)
3. **Kakao Client Secret**: 기존 Client Secret 코드
4. **Save**

**Authentication → URL Configuration**:
- **Site URL**: (Vercel preview URL 정해지면 등록. 임시로 `https://mindcoach-ai-quest.lovable.app`도 가능)
- **Redirect URLs**:
  ```
  http://localhost:8080/auth/callback
  https://*-vercel.app/auth/callback     (Vercel preview wildcard)
  https://mindcoach-ai-quest.lovable.app/auth/callback    (cut-over 전 임시)
  ```

### 1-3. Edge Function 시크릿 등록

**Project Settings → Edge Functions → Secrets**:

| Secret | Source | 비고 |
|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com → API key 발급 | **신규** (Lovable AI 대체) |
| `CRON_SECRET` | 임의 랜덤 문자열 (32자 이상) | weekly-grant 인증용. 재발급 |

선택:
| `GEMINI_MODEL` | `gemini-2.5-flash` (기본) 또는 `gemini-2.5-pro` | 미설정 시 flash |

자동 주입 (사용자가 등록할 필요 없음):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`

### 1-4. Anon Key (Publishable Key) 복사

**Project Settings → API → Project API keys → `anon` `public`** 복사.
→ 이 값을 사용자가 알려주시면:
- `src/integrations/supabase/client.ts` 폴백 값 교체 (현재 `REPLACE_WITH_NEW_PROJECT_ANON_KEY` placeholder)
- Vercel `VITE_SUPABASE_PUBLISHABLE_KEY` 환경변수에도 등록

---

## 2. 카카오 Developers 콘솔 — Redirect URI 갱신

**기존:** `https://bnhnaaarsyauppdbrbco.supabase.co/auth/v1/callback`
**신규:** `https://bpkzljeplyqvbmwwomom.supabase.co/auth/v1/callback`

**카카오 로그인 → Redirect URI**:
- 기존 URL 삭제
- 신규 URL 추가

다른 설정 (REST API 키, Client Secret, 동의항목, 플랫폼 도메인)은 그대로 재사용.

---

## 3. Edge Function 배포

**옵션 A — Supabase CLI:**
```bash
cd C:\Users\ricky\Desktop\mindcoach-ai-quest
supabase functions deploy chat-coaching
supabase functions deploy create-payment-order
supabase functions deploy verify-payment
supabase functions deploy weekly-grant
```

**옵션 B — Supabase MCP:**
- `deploy_edge_function` 도구 사용 (project_id=`bpkzljeplyqvbmwwomom`)

**검증:**
```bash
# chat-coaching 헬스 체크 (인증 필요하므로 401 정상)
curl -i https://bpkzljeplyqvbmwwomom.supabase.co/functions/v1/chat-coaching

# weekly-grant (verify_jwt=false, CRON_SECRET로 보호)
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  https://bpkzljeplyqvbmwwomom.supabase.co/functions/v1/weekly-grant
```

---

## 4. Vercel 프로젝트 생성

### 4-1. GitHub push

```bash
git push -u origin vercel-migration
```

### 4-2. Vercel Dashboard
- **Add New Project** → GitHub repo `mindcoach-ai-quest` import
- **Framework Preset**: Vite (자동 감지)
- **Branch**: `vercel-migration`
- **Build Command**: `npm run build` (기본)
- **Output Directory**: `dist` (기본)

### 4-3. 환경변수 (Production + Preview 둘 다)

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://bpkzljeplyqvbmwwomom.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | (1-4에서 복사한 anon key) |

`VITE_` prefix 필수 (Vite는 이 prefix가 있어야 클라이언트 번들에 노출).

### 4-4. preview URL 확보 후
- Supabase Auth Redirect URLs에 preview URL 추가 (1-2의 wildcard로 커버 가능)
- 카카오 콘솔 Web 플랫폼 도메인에도 preview 호스트 추가

---

## 5. 검증 체크리스트 (Vercel preview URL에서)

- [ ] 랜딩 페이지 정상 표시
- [ ] 카카오 로그인 → `/onboarding` 도달
- [ ] `auth.users` + `profiles` 행 자동 생성 (`handle_new_user` 트리거)
- [ ] `analytics_events`에 `signup_attempt` (`method=kakao`) 발화
- [ ] 통합검사 (INT) + 단일검사 1종 완료 → 결과 페이지 정상
- [ ] chat-coaching 스트리밍 응답 (Gemini, 3~5문장 정상)
- [ ] 캐릭터 선택 → `profiles.selected_breed` 저장
- [ ] mock 결제 플로우 (create-payment-order → verify-payment) 통과
- [ ] weekly-grant (cron으로 호출 시 정상 — 수동 트리거 가능)

---

## 6. Cut-over

검증 모두 통과 후:

1. `vercel-migration` → `main` 머지 (PR or 직접)
2. Vercel Production 배포 자동 트리거 (main branch)
3. Supabase Auth Site URL을 Vercel production URL로 변경
4. Supabase Auth Redirect URLs에서 Lovable 도메인 제거
5. 커스텀 도메인 받으면 Vercel + Supabase + 카카오 콘솔 모두 갱신

Lovable 인스턴스는 한동안 유지 (롤백 옵션). 1~2주 안정 운영 후 Lovable 프로젝트 보관/삭제.

---

## 7. 흔한 오류 + 대응

| 증상 | 원인 | 해결 |
|---|---|---|
| Vercel 빌드 실패 — `import.meta.env.VITE_SUPABASE_URL` undefined | 환경변수 미설정 또는 `VITE_` prefix 누락 | Vercel 콘솔에서 재등록 |
| 카카오 로그인 후 "Invalid redirect URI" | 카카오 콘솔 Redirect URI를 갱신 안 함 | §2 확인 |
| chat-coaching 500 — `GEMINI_API_KEY is not configured` | Edge Function 시크릿 미등록 | §1-3 확인 |
| chat-coaching 응답 형식 다름 | Gemini OpenAI 호환 엔드포인트가 응답 포맷 변경 | 프런트 `coaching-stream.ts` 파서 점검 |
| `profiles` 행 자동 생성 안 됨 | `handle_new_user` 트리거 미적용 | 마이그레이션 누락 확인 |
| chat-coaching 401 | `verify_jwt = true`이므로 클라이언트가 Authorization 헤더 누락 | `coaching-stream.ts`의 Bearer 헤더 확인 |

---

## 8. 사용자 액션 요약 (지금 해야 할 일)

1. ☐ Supabase `bpkzljeplyqvbmwwomom`에서 anon key 복사 → 나한테 알려주기
2. ☐ Google AI Studio (https://aistudio.google.com) → API key 발급 → 메모
3. ☐ `CRON_SECRET` 임의 생성 (32자 랜덤) → 메모
4. ☐ Supabase CLI 설치 여부 확인 (`supabase --version`) — 없으면 MCP 사용
5. ☐ Vercel 계정 보유 여부 확인 (없으면 가입)

1번 받으면 즉시 client.ts 폴백 교체. 그 후 순서대로 진행.
