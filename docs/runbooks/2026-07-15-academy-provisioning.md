# 학원 프로비저닝 런북

**대상:** 슈퍼 어드민 (마이치 운영팀)
**작성일:** 2026-07-15

## 프로세스

### 1. 학원 관리자 이메일 등록

Supabase Dashboard → **Authentication → Users → Add user → Send invitation**

- 이메일: 학원장이 사용할 이메일 (예: `admin@myacademy.com` 또는 임시 이메일)
- Auto Confirm User 체크 (즉시 활성화)
- 임시 비밀번호 입력 (또는 매직 링크 발송)

### 2. auth.users.id 확인

Users 리스트에서 새로 생성된 유저 클릭 → `User UID` 복사.

### 3. SQL Editor에서 프로비저닝 함수 실행

```sql
select public.provision_academy(
  '서울대치학원',                     -- 학원 이름
  '<복사한 uuid>'::uuid,              -- 관리자 user id
  'MYCH-2601'                          -- 학원 코드 (공유용, 대소문자 무관)
);
```

반환되는 `academy_id`를 기록.

### 4. 학원장에게 전달

- **로그인 URL**: `https://mindcoach-ai-quest.vercel.app/auth`
- **이메일 + 임시 비밀번호**
- **학원 코드** (원생 배포용): `MYCH-2601`

### 5. 첫 로그인 후 안내

- 학원장이 `/auth`에서 이메일+비밀번호로 로그인
- 로그인 성공 시 자동으로 `/admin`으로 이동
- (권장) 마이페이지 또는 Supabase 이메일 재설정으로 비밀번호 변경

## 학원 코드 명명 규칙

- 형식: `<학원약칭>-<연월>` 예: `MYCH-2601`, `MEIN-2607`, `TEST-0001`
- 대소문자 무관 (lower 인덱스 존재)
- 유니크 제약 있음 — 중복 시 함수 실행 실패

## 회수/재발급

학원 계약 종료 시 SQL Editor에서:

```sql
-- 코드 무효화 (원생 신규 연결 차단)
update public.academies set code = code || '-EXPIRED' where id = '<academy_id>';

-- 관리자 계정 강등
update public.profiles set user_type = 'student' where id = '<admin_user_id>';
```

## 트러블슈팅

| 증상 | 원인 | 대응 |
|---|---|---|
| `profile not found for user` | Auth 유저는 있으나 profiles 트리거 미실행 | `insert into profiles (id) values ('<uuid>')` 수동 삽입 |
| `duplicate key value violates code` | 학원 코드 중복 | 코드 재선택 |
| 학원장이 로그인 후에도 `/dashboard`로 감 | user_type 승격 실패 | `select user_type from profiles where id = '<uuid>'` 확인 후 재실행 |

## 관련 파일

- 마이그레이션: `supabase/migrations/20260715120000_academies_and_admin_dashboard.sql`
- 프로비저닝 함수: `supabase/migrations/20260715120200_academy_provisioning.sql`
- 디자인 문서: `docs/plans/2026-07-15-b2b-academy-admin-design.md`
