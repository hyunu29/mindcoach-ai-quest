# 학원 교직원 심리검사 통합 디자인

**날짜**: 2026-07-28
**작업 브랜치**: `vercel-migration`
**스코프**: 학원 관리자용 교직원 심리건강 자가 진단검사(30문항 4점 Likert)를 시스템에 추가

## 배경

- 회의(2026-07-15)에서 "학원 관계자용 간이 심리검사 및 AI 코칭 이용 가능" 결정
- 원본 PDF(`docs/plans/2026-07-28-academy-staff-test-source.pdf`)에서 검사 내용 확보
- 4개 하위 영역 · 총 30문항 · 4점 Likert(0~3점) · 90점 만점
- 기존 원생 검사 26종은 5점 Likert 하드코딩 상태

## 확정 결정

| # | 결정 |
|---|---|
| 1 | 척도 처리: `tests` 테이블에 `likert_min`/`likert_max`/`likert_labels` 필드 추가 (원본 4점 유지) |
| 2 | 접근: 학원 관리자만. `is_staff_only` 필드로 원생 필터 |
| 3 | 페이지 구조: `/admin/staff-test` 소개 페이지 + 원생 응시/결과 페이지 재사용 |

## DB 스키마 확장

```sql
alter table public.tests
  add column likert_min integer not null default 1,
  add column likert_max integer not null default 5,
  add column likert_labels jsonb,
  add column is_staff_only boolean not null default false;

create index idx_tests_is_staff_only on public.tests (is_staff_only) where is_staff_only;
```

`likert_labels` 예:
```json
["전혀 그렇지 않다", "가끔 그렇다 (주 1~2회)", "자주 그렇다 (주 3~4회)", "거의 항상 그렇다 (주 5회 이상)"]
```

## 검사 데이터 (STAFF-1)

- ID: `STAFF-1`
- 카테고리: `STAFF`
- Related syndrome: `교직원 번아웃`
- Question count: 30
- Duration: 10분
- Is free: true (관리자 무료), Is staff only: true
- Subdomains (4개):
  1. 정서적 및 신체적 우울 증상 (8문항)
  2. 학생 및 학부모 관리에 따른 감정소모 (8문항)
  3. 근무환경 및 직무 스트레스 (8문항)
  4. 사회적 고립 및 냉소성 (6문항)
- Likert: 0~3 (4개 라벨)

### 30문항 전체 목록

**정서적 및 신체적 우울 증상 (8)**
1. 아침에 눈을 뜰 때 깊은 무기력감이나 우울함을 느낀다.
2. 예전에 즐겁게 하던 일이나 취미 활동에 아무런 흥미를 느끼지 못한다.
3. 푹 자고 일어나도 피로가 저혀 풀리지 않거나, 오히려 온 몸이 묵직하다.
4. 이유 없이 눈물이 나거나 마음이 쉽게 쿵쾅거리고 불안해진다.
5. 식욕이 급격히 떨어지거나, 반대로 스트레스로 인한 폭식을 하게 된다.
6. 밤에 잠들기 어렵거나, 자다가 자주 깨서 다시 잠들지 못한다.
7. 내가 가치 없는 사람처럼 느껴지거나, 나만 뒤처지고 있다는 자괴감이 든다.
8. 하루 중 대부분의 시간에 마음이 멍하고 집중하기가 어렵다.

**학생 및 학부모 관리에 따른 감정소모 (8)**
9. 학생들의 성적 하락이나 수시/정시 결과에 대해 과도한 죄책감이나 중압감을 느낀다.
10. 학생이나 학부모의 컴플레인(민원)을 접할 때 필요 이상으로 가슴이 답답하고 두렵다.
11. 학생들을 진심으로 대하기보다 영혼 없이 기계적으로 응대하게 된다.
12. 학생들의 둔감하거나 비협조적인 태도를 볼 때 감정 조절이 어렵고 울컥 화가 난다.
13. 상담이나 생활지도 업무를 앞두고 심한 부담감과 피하고 싶은 마음이 든다.
14. 학원 내에서 일어나는 학생 관련 문제나 사고가 모두 내 탓으로 느껴진다.
15. 퇴근 후(또는 휴게시간)에도 학생이나 학부모에게 연락이 올까 봐 불안해한다.
16. 학생들에게 더 이상 긍정적인 영향을 주지 못하는 '무능한 선생님'이라는 생각이 든다.

**근무환경 및 직무 스트레스 (8)**
17. 출근할 때나 학원 정문을 통과할 때 가슴이 답답하고 숨이 막히는 느낌을 느낀다.
18. 과도한 근무 시간이나 불규칙한 생활 패턴으로 인해 삶의 균형이 깨졌다고 느낀다.
19. 나에게 주어진 역할(강의/관리/입시 등)의 양이 혼자 감당하기 버겁다.
20. 학원 특유의 폐쇄적이거나 고립된 환경 때문에 갇혀 있다는 답답함을 느낀다.
21. 직장 내(동료, 상사, 원장 등)와의 소통이 원활하지 않고 혼자 고립된 것 같다.
22. 나의 노력이 성과나 보상으로 충분히 인정받지 못한다고 느낀다.
23. 쉬는 날에도 학원 업무나 학생 관리 생각에서 벗어나지 못한다.
24. 이 일을 언제까지 계속 할 수 있을지 미래에 대한 불확실성으로 우울해진다.

**사회적 고립 및 냉소성 (6)**
25. 퇴근 후나 쉬는 날에 가족, 친구 등 지인들과 연락하거나 만나는 것이 귀찮고 피하고 싶다.
26. 타인에게 내 힘듦을 털어놓아도 아무것도 바뀌지 않을 것이라 생각하여 말을 아끼게 된다.
27. 주변 사람들이 나를 이해하지 못하거나 나에게 관심이 없다고 느낀다.
28. "다 의미없다", "어차피 안 될 것이다."와 같은 냉소적인 생각이 자주 든다.
29. 혼자 있을 때 원인을 알 수 없는 외로움이나 고립감이 강하게 밀려온다.
30. 현재 상황을 벗어날 수 있는 방법이 없다는 무기력함이나 절망감이 든다.

## 결과 해석 (총점 90점 만점)

- **0~22점 (정상범위)**: 현재 직무 스트레스를 적절하게 관리하고 계십니다. 주기적인 휴식과 환기로 건강한 상태 유지가 필요합니다.
- **23~44점 (경도 우울 및 경미한 번아웃)**: 직무 관련 스트레스와 감정 소모가 누적되고 있습니다. 휴식시간을 늘리고, 동료나 주변 사람들과 힘듦을 공유하는 것이 좋습니다.
- **45~66점 (중증도 우울 및 심각한 번아웃)**: 높은 수준의 우울감과 피로를 겪고 있습니다. 업무 우선순위를 조정하고, 전문 상담이나 심리적 지원 조치가 필요합니다.
- **67~90점 (고도 우울 위험군)**: 즉각적인 휴식과 전문적인 치료가 강력하게 권장됩니다.

## 라우팅

```
/admin/staff-test        → StaffTestIntroPage (신규)
/tests/STAFF-1           → TestTakingPage 재사용 (allowAdmin)
/results/<result_id>     → ResultsPage 재사용
```

## 원생 필터

TestsPage(`src/pages/TestsPage.tsx`) fetch에 `.eq('is_staff_only', false)` 추가 → 원생 목록에서 STAFF-1 완전 제외.

## TestTakingPage 척도 렌더링 변경

기존 하드코딩된 `likertOptions` 배열을 검사 데이터에서 로드:
- `test.likert_min`, `test.likert_max`, `test.likert_labels` 참조
- 반전 처리 공식 `6 - raw`를 `likert_max + likert_min - raw`로 일반화

## ResultsPage — STAFF-1 전용 해석

기존 검사 해석 로직에 test_id === 'STAFF-1' 분기 or `interpretation` 필드 활용:
- 결과 페이지에서 총점 + 4구간 해석 문구 노출
- 하위 영역별 소계도 표시

## AdminLayout 사이드바

```
[체험]
심리검사 체험 → /tests
AI 코칭 체험 → /coaching
교직원 심리검사 → /admin/staff-test   ← 신규
```

## StaffTestIntroPage 구조

- 헤더: 검사명, 4개 영역 소개, 30문항 · 10분 안내
- 지난 응시 기록: 최근 결과 카드 (있으면)
- CTA: "새로 응시하기" → `/tests/STAFF-1`

## 파일 변경 개요

| 파일 | 변경 |
|---|---|
| `supabase/migrations/YYYYMMDD_tests_likert_and_staff.sql` | 신규 (컬럼 4개 추가) |
| `supabase/migrations/YYYYMMDD_seed_staff_test.sql` | 신규 (STAFF-1 seed) |
| `src/pages/admin/StaffTestIntroPage.tsx` | 신규 |
| `src/pages/TestsPage.tsx` | is_staff_only 필터 |
| `src/pages/TestTakingPage.tsx` | 검사별 Likert 척도 반영 |
| `src/pages/ResultsPage.tsx` | STAFF-1 전용 해석 문구 |
| `src/layouts/AdminLayout.tsx` | 사이드바 링크 |
| `src/App.tsx` | `/admin/staff-test` 라우트 |

## 스코프 밖 (v3+)

- 관리자 응시 히스토리 페이지
- 학원 여러 교직원 응시 결과 통합 대시보드
- 문항별 커스텀 옵션(예: 반전 채점 지시 등)

## 검증 가설

1. 학원 관리자가 이 검사를 실제로 응시하는가
2. 자기 상태 파악 후 학원 원생 대상 프로그램 도입 의향에 긍정적 영향
