// ⚠️ 서버 전용 가격 카탈로그 — 클라이언트에서 import 금지
export type ProductType = 'single_test' | 'pro_subscription';

export interface ProductCatalogEntry {
  productType: ProductType;
  productId: string;
  amount: number;
  name: string;
}

const TEST_IDS: Array<{ id: string; name: string }> = [
  { id: 'A', name: 'FOMO 증후군 검사' },
  { id: 'A-1', name: '루틴 강박 증후군 검사' },
  { id: 'A-3', name: '성취중독 증후군 검사' },
  { id: 'A-4', name: '실패공포 증후군 검사' },
  { id: 'A-5', name: '자기비하 증후군 검사' },
  { id: 'A-6', name: '학습 강박 증후군 검사' },
  { id: 'B', name: '강박적 공부 증후군 검사' },
  { id: 'B-1', name: '만성피로 증후군 검사' },
  { id: 'B-2', name: '분노조절 곤란 증후군 검사' },
  { id: 'B-3', name: '소진 증후군 검사' },
  { id: 'B-4', name: '예상불안 증후군 검사' },
  { id: 'B-5', name: '자기정체감 혼란 증후군 검사' },
  { id: 'B-6', name: '학습회피 증후군 검사' },
  { id: 'C', name: '긴장성 근육통 증후군 검사' },
  { id: 'C-1', name: '무대공포 증후군 검사' },
  { id: 'C-2', name: '비교열등감 증후군 검사' },
  { id: 'C-3', name: '수면장애 증후군 검사' },
  { id: 'C-4', name: '완벽주의 증후군 검사' },
  { id: 'C-5', name: '정보과부하 증후군 검사' },
  { id: 'D', name: '낮은 자기효능감 증후군 검사' },
  { id: 'D-2', name: '사회적 위축 증후군 검사' },
  { id: 'D-3', name: '시간 강박 증후군 검사' },
  { id: 'D-4', name: '우울 증후군 검사' },
  { id: 'D-5', name: '정서기복 증후군 검사' },
  { id: 'E', name: '두통·편두통 증후군 검사' },
  { id: 'E-1', name: '백지 증후군 검사' },
  { id: 'E-2', name: '성취불안 증후군 검사' },
  { id: 'E-4', name: '위장관 증후군 검사' },
  { id: 'E-5', name: '집중력 결핍 증후군 검사' },
  // 별칭 슬러그 (BM 측 명명) — 임시
  { id: 'comparison-anxiety', name: '비교불안 검사' },
  { id: 'sns-dependency', name: 'SNS 의존도 검사' },
  { id: 'burnout', name: '번아웃 검사' },
  { id: 'perfectionism', name: '완벽주의 검사' },
];

// TODO: 추후 DB tests 테이블의 price 컬럼으로 이전
export const PRODUCT_CATALOG: ProductCatalogEntry[] = [
  ...TEST_IDS.map((t) => ({
    productType: 'single_test' as const,
    productId: t.id,
    amount: 2900,
    name: t.name,
  })),
  {
    productType: 'pro_subscription' as const,
    productId: 'pro-monthly',
    amount: 9900,
    name: 'Pro 멤버십 (월)',
  },
];

export function findProduct(productType: ProductType, productId: string): ProductCatalogEntry | null {
  return PRODUCT_CATALOG.find((p) => p.productType === productType && p.productId === productId) ?? null;
}