// 무료 검사 슬러그 목록 (게이트 우회 대상)
export const FREE_TEST_SLUGS = new Set<string>([
  'INT', // 통합검사 (게이트웨이) — 영구 무료
  'E-3', // 시험불안 증후군 검사 — 무료 진입점
  'A-2', // 번아웃 증후군 검사 — 무료 진입점
  'D-1', // 미루기 증후군 검사 — 무료 진입점
  'STAFF-1', // 학원 교직원 심리검사 — 관리자 무료
]);

export function isFreeTest(testSlug: string): boolean {
  return FREE_TEST_SLUGS.has(testSlug);
}