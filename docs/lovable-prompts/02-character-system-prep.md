# Lovable 프롬프트 02 — 캐릭터 마스코트 시스템 (준비만, 실행 보류)

**상태:** 🟡 **아직 실행하지 말 것**

**보류 사유:**
1. 김민수가 Gemini Pro로 캐릭터 이미지 96장(4 breed × 6 emotion × 4 trend) 생성 중
2. 자산이 Supabase Storage `character-assets` 버킷에 업로드되어야 컴포넌트가 동작
3. Phase 7 코드는 이미 완료 (Step 1~7 커밋됨) — Lovable 추가 작업 ≠ 코드, ≠ 자산
4. 대규모 변경이라 자산 준비 완료 후 일괄 점검 필요

**선행 조건 (모두 충족 후 실행):**
- [ ] 김민수 캐릭터 이미지 96장 + 4 breed 카드 완성
- [ ] Supabase Storage `character-assets` 버킷에 업로드 완료
- [ ] 마이그레이션 `20260609120000_add_character_columns_to_profiles.sql` push 적용
- [ ] 마이그레이션 `20260609120100_create_character_assets_bucket.sql` push 적용
- [ ] 로컬에서 useCharacter 훅 정상 동작 1차 검증

---

## Lovable에 붙여넣을 프롬프트 (선행 조건 충족 후)

```
캐릭터 마스코트 시스템 자산 업로드가 완료됐어. 다음 통합 QA를 진행해줘.

## Phase 7 이미 구현된 코드 (확인만, 수정 금지)

- src/lib/character/types.ts — Breed, PrimaryEmotion, CharacterTrend 타입
- src/lib/character/asset-url.ts — Storage URL 빌더 (STORAGE_BASE 하드코딩)
- src/lib/character/recommend.ts — 10영역 가중치 알고리즘
- src/lib/character/trend.ts — 7일 트렌드 계산
- src/components/character/CharacterAvatar.tsx — hero/card/mini 3 size
- src/components/character/CharacterSelectModal.tsx — 4종 카드 선택 UI
- src/hooks/useCharacter.ts — 조회/선택/변경 (try/catch 포함)

## 1. 자산 로딩 검증

각 breed(시바, 푸들, 코숏, 러시안블루) × 각 emotion(happy/calm/neutral/sad/angry/anxious) × 각 trend(rising/stable/declining/crashing)에 대해:
- CharacterAvatar가 정상 로딩되는지
- 404가 발생하는 조합이 있으면 누락 자산 리포트

## 2. 통합 흐름 QA

다음 사용자 흐름을 시뮬레이션 또는 시각 확인:

### A. 신규 사용자
1. 통합검사 완료 → 결과 페이지 도달
2. ResultsPage에 CharacterRecommendationCard 표시 확인
3. "이 캐릭터와 함께하기" 클릭 → CharacterSelectModal 열림
4. 4종 카드 그리드 정상 표시
5. 선택 → profiles.character_breed 저장 확인
6. character_recommended, character_recommendation_clicked 이벤트 발화 확인

### B. 기존 사용자 (홈)
1. DashboardPage 진입
2. Hero 영역에 본인 마스코트 (300×300) 표시
3. 오늘 감정 기록 기반 emotion 매칭 확인
4. 7일 트렌드 계산 기반 trend 매칭 확인
5. character_viewed_home 이벤트가 하루 1회만 발화 (localStorage dedup) 확인

### C. 마스코트 변경
1. ProfilePage → "내 마스코트" 카드
2. 변경 모달 → 다른 breed 선택
3. DashboardPage Hero가 즉시 반영되는지

## 3. 회귀 체크

- 통합검사 채점 알고리즘에 INSUFFICIENT/TIE 케이스 정상 처리
- 마이그레이션 미적용 사용자(이전 가입자)도 spinner 무한 루프 없이 fallback 표시
- 다크모드/모바일에서 CharacterAvatar 깨짐 없음

## 4. 결과 보고

- [자산] 누락된 emotion/trend 조합 목록
- [흐름 A/B/C] 각 단계 통과 여부
- [이벤트] analytics_events 테이블에서 5종 이벤트 발화 확인
- [회귀] 통합검사/대시보드 기존 기능 정상 여부
- [성능] CharacterAvatar 초기 로딩 시간 (LCP 영향)

❌ 절대 하지 말 것:
- 추천 알고리즘(recommend.ts) 가중치 수정
- 마이그레이션 파일 수정/추가
- 새로운 breed 추가
```

---

## 통과 후 다음 단계

1. analytics-queries.md의 character funnel SQL 5종을 production에서 실행
2. 7일간 character_viewed_home, character_recommended 데이터 수집
3. 추천 알고리즘 가중치 튜닝 (DAU/retention 데이터 기반)
4. Phase 7-8 (배포 후 이벤트 와이어링 실측 검증) 완료 처리
