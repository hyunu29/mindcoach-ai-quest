export interface DisplayProduct {
  productType: 'single_test' | 'pro_subscription' | 'credit_pack';
  productId: string;
  name: string;
  description: string;
  amount: number;
  currency: 'KRW';
  category?: string;
  badge?: string;
  comingSoon?: boolean;
}

// ⚠️ supabase/functions/_shared/pricing.ts 와 productId/amount 동기화 필수
export const SINGLE_TEST_DISPLAY: DisplayProduct[] = [
  { productType: 'single_test', productId: 'A', name: 'FOMO 증후군 검사', description: '뒤처질까 두려운 마음, 정보·관계 강박을 점검합니다', amount: 5900, currency: 'KRW', category: 'A' },
  { productType: 'single_test', productId: 'A-1', name: '루틴 강박 증후군 검사', description: '계획·루틴에 갇혀버린 자신을 돌아봅니다', amount: 5900, currency: 'KRW', category: 'A' },
  { productType: 'single_test', productId: 'A-3', name: '성취중독 증후군 검사', description: '성과에 집착하는 마음의 강도를 측정합니다', amount: 5900, currency: 'KRW', category: 'A' },
  { productType: 'single_test', productId: 'A-4', name: '실패공포 증후군 검사', description: '실패를 두려워하는 강도와 회피 패턴을 확인합니다', amount: 5900, currency: 'KRW', category: 'A' },
  { productType: 'single_test', productId: 'A-5', name: '자기비하 증후군 검사', description: '자기 자신을 깎아내리는 패턴을 점검합니다', amount: 5900, currency: 'KRW', category: 'A' },
  { productType: 'single_test', productId: 'A-6', name: '학습 강박 증후군 검사', description: '공부에 매달리는 강박의 정도를 측정합니다', amount: 5900, currency: 'KRW', category: 'A' },
  { productType: 'single_test', productId: 'B', name: '강박적 공부 증후군 검사', description: '쉬어도 불안한 공부 강박을 점검합니다', amount: 5900, currency: 'KRW', category: 'B' },
  { productType: 'single_test', productId: 'B-1', name: '만성피로 증후군 검사', description: '쉬어도 풀리지 않는 피로를 점검합니다', amount: 5900, currency: 'KRW', category: 'B' },
  { productType: 'single_test', productId: 'B-2', name: '분노조절 곤란 증후군 검사', description: '폭발적·만성적 분노 패턴을 측정합니다', amount: 5900, currency: 'KRW', category: 'B' },
  { productType: 'single_test', productId: 'B-3', name: '소진 증후군 검사', description: '내 안의 소진 정도를 진단합니다', amount: 5900, currency: 'KRW', category: 'B' },
  { productType: 'single_test', productId: 'B-4', name: '예상불안 증후군 검사', description: '아직 일어나지 않은 일에 대한 불안을 점검합니다', amount: 5900, currency: 'KRW', category: 'B' },
  { productType: 'single_test', productId: 'B-5', name: '자기정체감 혼란 증후군 검사', description: '내가 누구인지 흔들리는 감각을 측정합니다', amount: 5900, currency: 'KRW', category: 'B' },
  { productType: 'single_test', productId: 'B-6', name: '학습회피 증후군 검사', description: '공부를 피하고 싶은 마음의 패턴을 살펴봅니다', amount: 5900, currency: 'KRW', category: 'B' },
  { productType: 'single_test', productId: 'C', name: '긴장성 근육통 증후군 검사', description: '몸으로 드러나는 긴장 신호를 점검합니다', amount: 5900, currency: 'KRW', category: 'C' },
  { productType: 'single_test', productId: 'C-1', name: '무대공포 증후군 검사', description: '발표·시선에 대한 두려움을 측정합니다', amount: 5900, currency: 'KRW', category: 'C' },
  { productType: 'single_test', productId: 'C-2', name: '비교열등감 증후군 검사', description: '타인과의 비교에서 오는 열등감을 진단합니다', amount: 5900, currency: 'KRW', category: 'C', badge: '추천' },
  { productType: 'single_test', productId: 'C-3', name: '수면장애 증후군 검사', description: '잠들지 못하는 밤의 패턴을 진단합니다', amount: 5900, currency: 'KRW', category: 'C' },
  { productType: 'single_test', productId: 'C-4', name: '완벽주의 증후군 검사', description: '완벽을 향한 압박감의 강도를 측정합니다', amount: 5900, currency: 'KRW', category: 'C' },
  { productType: 'single_test', productId: 'C-5', name: '정보과부하 증후군 검사', description: '쏟아지는 정보 속 피로감을 점검합니다', amount: 5900, currency: 'KRW', category: 'C' },
  { productType: 'single_test', productId: 'D', name: '낮은 자기효능감 증후군 검사', description: '"나는 못해"라는 마음의 강도를 측정합니다', amount: 5900, currency: 'KRW', category: 'D' },
  { productType: 'single_test', productId: 'D-2', name: '사회적 위축 증후군 검사', description: '사람과의 자리에서 움츠러드는 정도를 봅니다', amount: 5900, currency: 'KRW', category: 'D' },
  { productType: 'single_test', productId: 'D-3', name: '시간 강박 증후군 검사', description: '시간에 쫓기는 압박감을 측정합니다', amount: 5900, currency: 'KRW', category: 'D' },
  { productType: 'single_test', productId: 'D-4', name: '우울 증후군 검사', description: '가라앉은 기분의 정도를 진단합니다', amount: 5900, currency: 'KRW', category: 'D' },
  { productType: 'single_test', productId: 'D-5', name: '정서기복 증후군 검사', description: '감정의 폭과 빈도를 점검합니다', amount: 5900, currency: 'KRW', category: 'D' },
  { productType: 'single_test', productId: 'E', name: '두통·편두통 증후군 검사', description: '스트레스성 두통의 패턴을 점검합니다', amount: 5900, currency: 'KRW', category: 'E' },
  { productType: 'single_test', productId: 'E-1', name: '백지 증후군 검사', description: '시험·발표에서 머리가 하얘지는 증상을 점검합니다', amount: 5900, currency: 'KRW', category: 'E' },
  { productType: 'single_test', productId: 'E-2', name: '성취불안 증후군 검사', description: '성과에 대한 불안의 강도를 측정합니다', amount: 5900, currency: 'KRW', category: 'E' },
  { productType: 'single_test', productId: 'E-4', name: '위장관 증후군 검사', description: '스트레스에 반응하는 위장의 신호를 점검합니다', amount: 5900, currency: 'KRW', category: 'E' },
  { productType: 'single_test', productId: 'E-5', name: '집중력 결핍 증후군 검사', description: '집중이 흩어지는 패턴을 측정합니다', amount: 5900, currency: 'KRW', category: 'E' },
];

export const PRO_PLAN_DISPLAY: DisplayProduct = {
  productType: 'pro_subscription',
  productId: 'pro-monthly',
  name: 'Pro 멤버십',
  description: '월 ₩9,900 / 50 크레딧 + 주간 검사 혜택',
  amount: 9900,
  currency: 'KRW',
};

export const CREDIT_PACK_DISPLAY: DisplayProduct[] = [
  { productType: 'credit_pack', productId: 'credit-pack-10', name: 'AI 크레딧 10개', description: 'AI 코칭 대화 약 10회', amount: 2900, currency: 'KRW' },
  { productType: 'credit_pack', productId: 'credit-pack-30', name: 'AI 크레딧 30개', description: 'AI 코칭 대화 약 30회', amount: 6900, currency: 'KRW' },
];