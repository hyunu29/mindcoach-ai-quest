// 무료 검사 슬러그 목록 (게이트 우회 대상)
export const FREE_TEST_SLUGS = new Set<string>([
  'INT', // 통합검사 (게이트웨이) — 영구 무료
  // TODO: 무료공개 3개 검사 선정 후 추가 (Tier 1 데이터 확정 후)
]);

export function isFreeTest(testSlug: string): boolean {
  return FREE_TEST_SLUGS.has(testSlug);
}