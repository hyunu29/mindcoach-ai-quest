// 무료 검사 슬러그 목록 (게이트 우회 대상)
// 2026-08-12 정책: 학생 무료 = 통합 게이트웨이(INT)만. 나머지는 전부 유료
// (유료검사 접근 = 결제 / 친구초대 이용권 / 이벤트 코드)
export const FREE_TEST_SLUGS = new Set<string>([
  'INT', // 통합검사 (게이트웨이) — 영구 무료
  'STAFF-1', // 학원 교직원 심리검사 — 관리자 무료
]);

export function isFreeTest(testSlug: string): boolean {
  return FREE_TEST_SLUGS.has(testSlug);
}
