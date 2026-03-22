// ============================================================
// 마인드코치 AI — Seed Data for Lovable / Supabase
// © 마인드코치 김종환. All rights reserved.
// ============================================================

// ─── Interfaces ─────────────────────────────────────────────

export interface Question {
  id: number;
  text: string;
  subdomain: string;
  subdomainEn: string;
  isReversed: boolean;
}

export interface Test {
  id: string;
  name: string;
  category: string;
  relatedSyndrome: string;
  description: string;
  comingSoon?: boolean;
  questions?: Question[];
}

export interface Syndrome {
  id: number;
  code: string;
  name: string;
  category: string;
  description: string;
  causes: string[];
  symptoms: string[];
  solutions: string[];
}

export interface ScoreRange {
  min: number;
  max: number;
  level: string;
  label: string;
  description: string;
  recommendation: string;
}

export interface ScoringGuide {
  totalQuestions: number;
  pointsPerQuestion: number;
  minScore: number;
  maxScore: number;
  timeLimitMinutes: number;
  reverseScoringNote: string;
  ranges: ScoreRange[];
}

export interface CoachingTurn {
  role: "user" | "coach";
  message: string;
}

export interface CoachingDialog {
  syndromeId: number;
  syndromeName: string;
  turns: CoachingTurn[];
}

export interface CrisisKeyword {
  keyword: string;
  severity: "high" | "critical";
}

// ─── Test ↔ Syndrome Mapping ────────────────────────────────

export const testSyndromeMap: Record<string, string> = {
  A: "FOMO 증후군",
  "A-1": "루틴 강박 증후군",
  "A-2": "번아웃 증후군",
  "A-3": "성취중독 증후군",
  "A-4": "실패공포 증후군",
  "A-5": "자기비하 증후군",
  "A-6": "학습 강박 증후군",
  B: "강박적 공부 증후군",
  "B-1": "만성피로 증후군",
  "B-2": "분노조절 곤란 증후군",
  "B-3": "소진 증후군",
  "B-4": "예상불안 증후군",
  "B-5": "자기정체감 혼란 증후군",
  "B-6": "학습회피 증후군",
  C: "긴장성 근육통 증후군",
  "C-1": "무대공포 증후군",
  "C-2": "비교열등감 증후군",
  "C-3": "수면장애 증후군",
  "C-4": "완벽주의 증후군",
  "C-5": "정보과부하 증후군",
  D: "낮은 자기효능감 증후군",
  "D-1": "미루기 증후군",
  "D-2": "사회적 위축 증후군",
  "D-3": "시간 강박 증후군",
  "D-4": "우울 증후군",
  "D-5": "정서기복 증후군",
  E: "두통·편두통 증후군",
  "E-1": "백지 증후군",
  "E-2": "성취불안 증후군",
  "E-3": "시험불안 증후군",
  "E-4": "위장관 증후군",
  "E-5": "집중력 결핍 증후군",
};

// ─── 26종 검사 목록 ─────────────────────────────────────────

export const tests: Test[] = [
  // ====== MVP 상세 문항 포함 (6종) ======

  // ── 검사 A: FOMO 증후군 ──
  {
    id: "A",
    name: "FOMO 증후군 검사",
    category: "A",
    relatedSyndrome: "FOMO 증후군",
    description:
      "SNS·비교불안으로 인한 집중력 저하와 자기통제력을 측정합니다.",
    questions: [
      // 하위영역 1: 비교불안 (Comparative Anxiety)
      { id: 1, text: "친구들의 공부량이나 성적을 보면 불안해진다.", subdomain: "비교불안", subdomainEn: "Comparative Anxiety", isReversed: false },
      { id: 2, text: "다른 사람의 성공 소식을 들으면 마음이 흔들린다.", subdomain: "비교불안", subdomainEn: "Comparative Anxiety", isReversed: false },
      { id: 3, text: "나만 뒤처지고 있는 것 같은 느낌이 든다.", subdomain: "비교불안", subdomainEn: "Comparative Anxiety", isReversed: false },
      { id: 4, text: "SNS에서 남들의 공부 인증을 보면 조급해진다.", subdomain: "비교불안", subdomainEn: "Comparative Anxiety", isReversed: false },
      { id: 5, text: "남들과 비교하지 않으려 해도 자꾸 비교하게 된다.", subdomain: "비교불안", subdomainEn: "Comparative Anxiety", isReversed: false },
      // 하위영역 2: SNS 의존 (Social Media Dependency)
      { id: 6, text: "공부 중에도 SNS 알림이 신경 쓰인다.", subdomain: "SNS 의존", subdomainEn: "Social Media Dependency", isReversed: false },
      { id: 7, text: "SNS를 하지 않으면 세상과 단절된 느낌이 든다.", subdomain: "SNS 의존", subdomainEn: "Social Media Dependency", isReversed: false },
      { id: 8, text: "공부 대신 SNS를 확인하다 보면 시간이 훌쩍 간다.", subdomain: "SNS 의존", subdomainEn: "Social Media Dependency", isReversed: false },
      { id: 9, text: "SNS에 나도 뭔가 올려야 안심이 된다.", subdomain: "SNS 의존", subdomainEn: "Social Media Dependency", isReversed: false },
      { id: 10, text: "SNS를 끊으면 불안하거나 허전하다.", subdomain: "SNS 의존", subdomainEn: "Social Media Dependency", isReversed: false },
      // 하위영역 3: 집중력 저하 (Reduced Focus)
      { id: 11, text: "공부 중 집중이 자주 끊기고 다른 생각이 든다.", subdomain: "집중력 저하", subdomainEn: "Reduced Focus", isReversed: false },
      { id: 12, text: "잠깐 쉬려다 스마트폰을 보면 공부 흐름이 완전히 깨진다.", subdomain: "집중력 저하", subdomainEn: "Reduced Focus", isReversed: false },
      { id: 13, text: "계획보다 SNS, 인터넷에 더 많은 시간을 쓴다.", subdomain: "집중력 저하", subdomainEn: "Reduced Focus", isReversed: false },
      { id: 14, text: "해야 할 일을 미루고 정보 검색만 하며 시간을 보낸다.", subdomain: "집중력 저하", subdomainEn: "Reduced Focus", isReversed: false },
      { id: 15, text: "공부 중 갑자기 '이게 맞나?'라는 생각이 올라온다.", subdomain: "집중력 저하", subdomainEn: "Reduced Focus", isReversed: false },
      // 하위영역 4: 자기통제·균형 (Self-Control & Balance) [역문항]
      { id: 16, text: "SNS를 하더라도 공부와 생활의 균형을 유지한다.", subdomain: "자기통제·균형", subdomainEn: "Self-Control & Balance", isReversed: true },
      { id: 17, text: "남들과 달라도 내 속도를 존중하려고 노력한다.", subdomain: "자기통제·균형", subdomainEn: "Self-Control & Balance", isReversed: true },
      { id: 18, text: "잠시 휴식해도 다시 집중할 수 있다.", subdomain: "자기통제·균형", subdomainEn: "Self-Control & Balance", isReversed: true },
      { id: 19, text: "비교 대신 내 성장에 집중하려고 한다.", subdomain: "자기통제·균형", subdomainEn: "Self-Control & Balance", isReversed: true },
      { id: 20, text: "디지털 기기를 스스로 통제할 수 있다.", subdomain: "자기통제·균형", subdomainEn: "Self-Control & Balance", isReversed: true },
    ],
  },

  // ── 검사 A-2: 번아웃 증후군 ──
  {
    id: "A-2",
    name: "번아웃 증후군 검사",
    category: "A",
    relatedSyndrome: "번아웃 증후군",
    description:
      "정서적 소진, 냉소, 무력감 수준과 회복 자원을 측정합니다.",
    questions: [
      // 정서적 소진 (Emotional Exhaustion)
      { id: 1, text: "공부를 시작하려고 하면 이미 지쳐 있는 느낌이다.", subdomain: "정서적 소진", subdomainEn: "Emotional Exhaustion", isReversed: false },
      { id: 2, text: "하루를 마치면 정신적으로 완전히 소모된 느낌이 든다.", subdomain: "정서적 소진", subdomainEn: "Emotional Exhaustion", isReversed: false },
      { id: 3, text: "쉬어도 피로가 잘 회복하지 않는다.", subdomain: "정서적 소진", subdomainEn: "Emotional Exhaustion", isReversed: false },
      { id: 4, text: "공부 생각만 해도 답답하고 숨이 막힌다.", subdomain: "정서적 소진", subdomainEn: "Emotional Exhaustion", isReversed: false },
      { id: 5, text: "최근 한달 동안 예전보다 짜증이 더 많아졌다.", subdomain: "정서적 소진", subdomainEn: "Emotional Exhaustion", isReversed: false },
      // 냉소·이탈 (Cynicism/Detachment)
      { id: 6, text: "공부가 무슨 의미가 싶을때가 자주 있다.", subdomain: "냉소·이탈", subdomainEn: "Cynicism/Detachment", isReversed: false },
      { id: 7, text: "성적이나 평가가 나와도 별 감흥이 없다.", subdomain: "냉소·이탈", subdomainEn: "Cynicism/Detachment", isReversed: false },
      { id: 8, text: "주변 사람들이 공부하라는 말이 들리면 더 멀어지고 싶다.", subdomain: "냉소·이탈", subdomainEn: "Cynicism/Detachment", isReversed: false },
      { id: 9, text: "과목이나 선생님에 대해 부정적으로만 보게 된다.", subdomain: "냉소·이탈", subdomainEn: "Cynicism/Detachment", isReversed: false },
      { id: 10, text: "학습 자체에 흥미가 거의 느껴지지 않는다.", subdomain: "냉소·이탈", subdomainEn: "Cynicism/Detachment", isReversed: false },
      // 무력감 (Inefficacy)
      { id: 11, text: "열심히 해도 성과가 없다는 생각을 자주 한다.", subdomain: "무력감", subdomainEn: "Inefficacy", isReversed: false },
      { id: 12, text: "나는 중요한 순간에 실수를 반복할 것 같다.", subdomain: "무력감", subdomainEn: "Inefficacy", isReversed: false },
      { id: 13, text: "계획을 세워도 지키기 어렵다.", subdomain: "무력감", subdomainEn: "Inefficacy", isReversed: false },
      { id: 14, text: "나보다 잘하는 친구들과 비교하면 나는 늘 부족하다.", subdomain: "무력감", subdomainEn: "Inefficacy", isReversed: false },
      { id: 15, text: "이번 시험에도 기대만큼 성과를 내기 힘들 것 같다.", subdomain: "무력감", subdomainEn: "Inefficacy", isReversed: false },
      // 회복자원 (Recovery/Resources) [역문항]
      { id: 16, text: "힘들어도 나를 회복시키는 방법을 알고 실천한다.", subdomain: "회복자원", subdomainEn: "Recovery/Resources", isReversed: true },
      { id: 17, text: "공부, 휴식 리듬(수면/식사/운동 등)을 대체로 유지한다.", subdomain: "회복자원", subdomainEn: "Recovery/Resources", isReversed: true },
      { id: 18, text: "스트레스를 느끼면 적절한 도움을 요청할 수 있다.", subdomain: "회복자원", subdomainEn: "Recovery/Resources", isReversed: true },
      { id: 19, text: "작은 성취를 찾아 스스로 격려한다.", subdomain: "회복자원", subdomainEn: "Recovery/Resources", isReversed: true },
      { id: 20, text: "벅찰때에도 핵심 과제부터 우선순위대로 처리한다.", subdomain: "회복자원", subdomainEn: "Recovery/Resources", isReversed: true },
    ],
  },

  // ── 검사 B: 강박적 공부 증후군 ──
  {
    id: "B",
    name: "강박적 공부 증후군 검사",
    category: "B",
    relatedSyndrome: "강박적 공부 증후군",
    description:
      "완벽주의 집착, 불안 회피, 자기비판 및 자기조절 결핍 수준을 측정합니다.",
    questions: [
      // 완벽주의 집착 (Perfectionistic Obsession)
      { id: 1, text: "하루 계획을 완벽히 지키지 못하면 불안하다.", subdomain: "완벽주의 집착", subdomainEn: "Perfectionistic Obsession", isReversed: false },
      { id: 2, text: "루틴이 조금이라도 어긋나면 공부 의욕이 떨어진다.", subdomain: "완벽주의 집착", subdomainEn: "Perfectionistic Obsession", isReversed: false },
      { id: 3, text: "공부는 항상 일정한 방식으로 해야 마음이 편하다.", subdomain: "완벽주의 집착", subdomainEn: "Perfectionistic Obsession", isReversed: false },
      { id: 4, text: "계획표에 빈칸이 생기면 죄책감을 느낀다.", subdomain: "완벽주의 집착", subdomainEn: "Perfectionistic Obsession", isReversed: false },
      { id: 5, text: "공부시간이 부족하면 자신이 나약하다고 생각한다.", subdomain: "완벽주의 집착", subdomainEn: "Perfectionistic Obsession", isReversed: false },
      // 불안 회피 (Anxiety Avoidance)
      { id: 6, text: "쉬면 불안해져서 다시 책상 앞에 앉게 된다.", subdomain: "불안 회피", subdomainEn: "Anxiety Avoidance", isReversed: false },
      { id: 7, text: "공부를 안 하면 실패할 것 같은 두려움이 든다.", subdomain: "불안 회피", subdomainEn: "Anxiety Avoidance", isReversed: false },
      { id: 8, text: "공부 외의 일을 하면 '시간 낭비'라는 생각이 든다.", subdomain: "불안 회피", subdomainEn: "Anxiety Avoidance", isReversed: false },
      { id: 9, text: "피곤해도 불안 때문에 계속 공부하게 된다.", subdomain: "불안 회피", subdomainEn: "Anxiety Avoidance", isReversed: false },
      { id: 10, text: "'공부를 안 하면 불행해질 것 같다'는 생각이 든다.", subdomain: "불안 회피", subdomainEn: "Anxiety Avoidance", isReversed: false },
      // 자기비판 불안 (Self-Critical Anxiety)
      { id: 11, text: "발표가 끝나면 \"내가 너무 못했어\"라고 자책한다.", subdomain: "자기비판 불안", subdomainEn: "Self-Critical Anxiety", isReversed: false },
      { id: 12, text: "실수 한번으로 전체를 망쳤다고 느낀다.", subdomain: "자기비판 불안", subdomainEn: "Self-Critical Anxiety", isReversed: false },
      { id: 13, text: "발표 후 다른 사람보다 부족했다고 느낀다.", subdomain: "자기비판 불안", subdomainEn: "Self-Critical Anxiety", isReversed: false },
      { id: 14, text: "발표 전부터 \"이번엔 또 틀릴거야\"라는 생각이 든다.", subdomain: "자기비판 불안", subdomainEn: "Self-Critical Anxiety", isReversed: false },
      { id: 15, text: "남보다 부족한 자신을 자주 비난한다.", subdomain: "자기비판 불안", subdomainEn: "Self-Critical Anxiety", isReversed: false },
      // 자기조절 결핍 (Self-Regulation Deficiency)
      { id: 16, text: "공부가 조금만 밀려도 자책감이 든다.", subdomain: "자기조절 결핍", subdomainEn: "Self-Regulation Deficiency", isReversed: false },
      { id: 17, text: "남들보다 덜 하면 스스로를 나무란다.", subdomain: "자기조절 결핍", subdomainEn: "Self-Regulation Deficiency", isReversed: false },
      { id: 18, text: "쉬는 자신을 보면 죄책감이 든다.", subdomain: "자기조절 결핍", subdomainEn: "Self-Regulation Deficiency", isReversed: false },
      { id: 19, text: "공부를 잘해도 \"아직 부족하다\"고 느낀다.", subdomain: "자기조절 결핍", subdomainEn: "Self-Regulation Deficiency", isReversed: false },
      { id: 20, text: "오늘 한 공부량이 만족스럽지 않으면 불안하다.", subdomain: "자기조절 결핍", subdomainEn: "Self-Regulation Deficiency", isReversed: false },
    ],
  },

  // ── 검사 E-3: 시험불안 증후군 ──
  {
    id: "E-3",
    name: "시험불안 증후군 검사",
    category: "E",
    relatedSyndrome: "시험불안 증후군",
    description:
      "시험 전후의 인지적·정서적·행동적 불안 수준과 대처능력을 측정합니다.",
    questions: [
      // 인지적 불안 (Cognitive Anxiety)
      { id: 1, text: "시험이 다가오면 머릿속이 복잡해지고 집중이 잘 안된다.", subdomain: "인지적 불안", subdomainEn: "Cognitive Anxiety", isReversed: false },
      { id: 2, text: "이번 시험에도 망할 것 같다는 생각이 자주 든다.", subdomain: "인지적 불안", subdomainEn: "Cognitive Anxiety", isReversed: false },
      { id: 3, text: "시험을 잘 보지 못하면 내 인생이 끝날 것 같다는 두려움이 든다.", subdomain: "인지적 불안", subdomainEn: "Cognitive Anxiety", isReversed: false },
      { id: 4, text: "시험 직전에 해야 할 일이 너무 많아 무엇부터 해야 할지 모르겠다.", subdomain: "인지적 불안", subdomainEn: "Cognitive Anxiety", isReversed: false },
      { id: 5, text: "시험 도중 문제를 읽어도 내용이 잘 떠오르지 않는다.", subdomain: "인지적 불안", subdomainEn: "Cognitive Anxiety", isReversed: false },
      { id: 6, text: "시험 전날 잠이 잘 오지 않는다.", subdomain: "인지적 불안", subdomainEn: "Cognitive Anxiety", isReversed: false },
      // 정서적 불안 (Emotional Anxiety)
      { id: 7, text: "시험 직전에는 심장이 빨리 뛰거나 손에 땀이 난다.", subdomain: "정서적 불안", subdomainEn: "Emotional Anxiety", isReversed: false },
      { id: 8, text: "시험지를 받는 순간 숨이 막히는 느낌이 든다.", subdomain: "정서적 불안", subdomainEn: "Emotional Anxiety", isReversed: false },
      { id: 9, text: "시험이 끝난 후에도 긴장감이 쉽게 사라지지 않는다.", subdomain: "정서적 불안", subdomainEn: "Emotional Anxiety", isReversed: false },
      { id: 10, text: "다른 친구들은 평온해 보이는데 나만 유난히 불안하다.", subdomain: "정서적 불안", subdomainEn: "Emotional Anxiety", isReversed: false },
      // 행동적 반응 (Behavioral Response)
      { id: 11, text: "불안할수록 공부 계획을 자주 바꾼다.", subdomain: "행동적 반응", subdomainEn: "Behavioral Response", isReversed: false },
      { id: 12, text: "공부 대신 SNS나 정리만 하며 시간을 보내는 경우가 많다.", subdomain: "행동적 반응", subdomainEn: "Behavioral Response", isReversed: false },
      { id: 13, text: "불안할수록 밤을 새우며 공부하려 한다.", subdomain: "행동적 반응", subdomainEn: "Behavioral Response", isReversed: false },
      { id: 14, text: "불안해서 공부를 미루거나 갑자기 포기하고 싶어진다.", subdomain: "행동적 반응", subdomainEn: "Behavioral Response", isReversed: false },
      { id: 15, text: "불안할때마다 특정 습관(손톱 물어뜯기, 볼펜 돌리기 등)을 반복한다.", subdomain: "행동적 반응", subdomainEn: "Behavioral Response", isReversed: false },
      // 대처능력 (Coping Ability) [역문항]
      { id: 16, text: "불안을 느껴도 금방 마음을 다잡을 수 있다.", subdomain: "대처능력", subdomainEn: "Coping Ability", isReversed: true },
      { id: 17, text: "시험 전에 나를 진정시키는 방법을 알고 있다.", subdomain: "대처능력", subdomainEn: "Coping Ability", isReversed: true },
      { id: 18, text: "불안을 느낄때는 주변 사람들에게 도움을 요청한다.", subdomain: "대처능력", subdomainEn: "Coping Ability", isReversed: true },
      { id: 19, text: "시험 직전에 '할 수 있다'는 확신이 생긴다.", subdomain: "대처능력", subdomainEn: "Coping Ability", isReversed: true },
      { id: 20, text: "불안하더라도 꾸준히 계획을 지켜나간다.", subdomain: "대처능력", subdomainEn: "Coping Ability", isReversed: true },
    ],
  },

  // ── 검사 C-4: 완벽주의 증후군 ──
  {
    id: "C-4",
    name: "완벽주의 증후군 검사",
    category: "C",
    relatedSyndrome: "완벽주의 증후군",
    description:
      "높은 기준, 실패 공포, 자기비판, 경직성 수준을 측정합니다.",
    questions: [
      // 높은 기준 (High Standards)
      { id: 1, text: "어떤 일이든 최고 수준으로 해내야 만족할 수 있다.", subdomain: "높은 기준", subdomainEn: "High Standards", isReversed: false },
      { id: 2, text: "계획이 조금만 어긋나도 불안하거나 짜증이 난다.", subdomain: "높은 기준", subdomainEn: "High Standards", isReversed: false },
      { id: 3, text: "공부나 과제는 늘 완벽히 끝내야 직성이 풀린다.", subdomain: "높은 기준", subdomainEn: "High Standards", isReversed: false },
      { id: 4, text: "목표를 세울 때 다른 사람보다 훨씬 높게 잡는 편이다.", subdomain: "높은 기준", subdomainEn: "High Standards", isReversed: false },
      { id: 5, text: "완벽하지 않으면 노력의 의미가 없다고 느낀다.", subdomain: "높은 기준", subdomainEn: "High Standards", isReversed: false },
      // 실패 공포 (Fear of Failure)
      { id: 6, text: "실수하면 사람들에게 무시당할까봐 걱정된다.", subdomain: "실패 공포", subdomainEn: "Fear of Failure", isReversed: false },
      { id: 7, text: "결과가 나쁘면 내 가치 자체가 떨어진다고 느낀다.", subdomain: "실패 공포", subdomainEn: "Fear of Failure", isReversed: false },
      { id: 8, text: "시험을 망치면 모든 것이 끝날 것 같다는 생각이 든다.", subdomain: "실패 공포", subdomainEn: "Fear of Failure", isReversed: false },
      { id: 9, text: "틀릴까봐 시도조차 못할 때가 많다.", subdomain: "실패 공포", subdomainEn: "Fear of Failure", isReversed: false },
      { id: 10, text: "실패 후 다시 도전하기가 두렵다.", subdomain: "실패 공포", subdomainEn: "Fear of Failure", isReversed: false },
      // 자기비판 (Self-Criticism)
      { id: 11, text: "주변에서 칭찬을 받아도 '아직 부족해'라고 생각한다.", subdomain: "자기비판", subdomainEn: "Self-Criticism", isReversed: false },
      { id: 12, text: "남들보다 잘해도 늘 아쉬운 부분만 보인다.", subdomain: "자기비판", subdomainEn: "Self-Criticism", isReversed: false },
      { id: 13, text: "자신에게 실수의 여지를 전혀 주지 않는다.", subdomain: "자기비판", subdomainEn: "Self-Criticism", isReversed: false },
      { id: 14, text: "조금이라도 실수하면 스스로를 심하게 자책한다.", subdomain: "자기비판", subdomainEn: "Self-Criticism", isReversed: false },
      { id: 15, text: "내 기준에 못 미치면 하루종일 그 생각이 떠오른다.", subdomain: "자기비판", subdomainEn: "Self-Criticism", isReversed: false },
      // 경직/유연성 부족 (Rigidity/Low Flexibility) [역문항]
      { id: 16, text: "완벽하지 않아도 괜찮다고 생각할 수 있다.", subdomain: "경직/유연성 부족", subdomainEn: "Rigidity/Low Flexibility", isReversed: true },
      { id: 17, text: "계획이 틀어져도 대처할 수 있는 편이다.", subdomain: "경직/유연성 부족", subdomainEn: "Rigidity/Low Flexibility", isReversed: true },
      { id: 18, text: "실패 속에서도 배울 점을 찾을 줄 안다.", subdomain: "경직/유연성 부족", subdomainEn: "Rigidity/Low Flexibility", isReversed: true },
      { id: 19, text: "일이 잘 안 풀릴 때 스스로를 위로할 수 있다.", subdomain: "경직/유연성 부족", subdomainEn: "Rigidity/Low Flexibility", isReversed: true },
      { id: 20, text: "모든 것을 통제하지 않아도 괜찮다는 생각이 든다.", subdomain: "경직/유연성 부족", subdomainEn: "Rigidity/Low Flexibility", isReversed: true },
    ],
  },

  // ── 검사 D-4: 우울 증후군 ──
  {
    id: "D-4",
    name: "우울 증후군 검사",
    category: "D",
    relatedSyndrome: "우울 증후군",
    description:
      "정서적 피로, 부정사고, 학업 무력감, 자기조절 상실 수준을 측정합니다.",
    questions: [
      // 정서적 피로 (Emotional Fatigue)
      { id: 1, text: "아침에 일어나기가 힘들고 하루가 막막하게 느껴진다.", subdomain: "정서적 피로", subdomainEn: "Emotional Fatigue", isReversed: false },
      { id: 2, text: "공부를 해도 머리에 들어오지 않아 포기하고 싶을 때가 있다.", subdomain: "정서적 피로", subdomainEn: "Emotional Fatigue", isReversed: false },
      { id: 3, text: "예전보다 웃는 일이 거의 없다.", subdomain: "정서적 피로", subdomainEn: "Emotional Fatigue", isReversed: false },
      { id: 4, text: "감정이 무겁고, 마음이 자주 가라앉는다.", subdomain: "정서적 피로", subdomainEn: "Emotional Fatigue", isReversed: false },
      { id: 5, text: "아무리 쉬어도 피로감이 사라지지 않는다.", subdomain: "정서적 피로", subdomainEn: "Emotional Fatigue", isReversed: false },
      // 자기비판·부정사고 (Self-Criticism & Negative Thinking)
      { id: 6, text: "\"나는 왜 이렇게 못하나\"라는 생각을 자주 한다.", subdomain: "자기비판·부정사고", subdomainEn: "Self-Criticism & Negative Thinking", isReversed: false },
      { id: 7, text: "나보다 잘하는 친구들을 보면 스스로 초라하게 느껴진다.", subdomain: "자기비판·부정사고", subdomainEn: "Self-Criticism & Negative Thinking", isReversed: false },
      { id: 8, text: "내 존재가 별로 가치가 없다고 느껴진다.", subdomain: "자기비판·부정사고", subdomainEn: "Self-Criticism & Negative Thinking", isReversed: false },
      { id: 9, text: "실수하거나 틀리면 나 자신을 심하게 탓한다.", subdomain: "자기비판·부정사고", subdomainEn: "Self-Criticism & Negative Thinking", isReversed: false },
      { id: 10, text: "노력해도 결국 실패할 것 같다는 생각이 든다.", subdomain: "자기비판·부정사고", subdomainEn: "Self-Criticism & Negative Thinking", isReversed: false },
      // 학업 무력감 (Academic Helplessness)
      { id: 11, text: "공부를 아무리 해도 성적이 오르지 않아 좌절감이 든다.", subdomain: "학업 무력감", subdomainEn: "Academic Helplessness", isReversed: false },
      { id: 12, text: "시험 기간이 다가오면 마음이 무겁고 불안하다.", subdomain: "학업 무력감", subdomainEn: "Academic Helplessness", isReversed: false },
      { id: 13, text: "공부를 시작하기가 두렵거나 부담스럽다.", subdomain: "학업 무력감", subdomainEn: "Academic Helplessness", isReversed: false },
      { id: 14, text: "성적이 내 인생의 전부처럼 느껴진다.", subdomain: "학업 무력감", subdomainEn: "Academic Helplessness", isReversed: false },
      { id: 15, text: "공부에 집중하려 해도 자꾸 딴 생각이 나거나 멍해진다.", subdomain: "학업 무력감", subdomainEn: "Academic Helplessness", isReversed: false },
      // 자기조절 상실 (Loss of Self-Regulation)
      { id: 16, text: "감정이 쉽게 무너지고 사소한 일에도 예민하다.", subdomain: "자기조절 상실", subdomainEn: "Loss of Self-Regulation", isReversed: false },
      { id: 17, text: "스트레스를 받으면 폭식, 수면, 휴대폰 사용 등으로 도피한다.", subdomain: "자기조절 상실", subdomainEn: "Loss of Self-Regulation", isReversed: false },
      { id: 18, text: "해야할 일을 알지만 쉽게 미루거나 회피한다.", subdomain: "자기조절 상실", subdomainEn: "Loss of Self-Regulation", isReversed: false },
      { id: 19, text: "스스로를 다독이거나 긍정적인 생각을 유지하기 어렵다.", subdomain: "자기조절 상실", subdomainEn: "Loss of Self-Regulation", isReversed: false },
      { id: 20, text: "공부하다 감정에 휘둘릴 때가 많다.", subdomain: "자기조절 상실", subdomainEn: "Loss of Self-Regulation", isReversed: false },
    ],
  },

  // ====== 나머지 20종 (comingSoon) ======
  { id: "A-1", name: "루틴 강박 증후군 검사", category: "A", relatedSyndrome: "루틴 강박 증후군", description: "일상 루틴에 대한 과도한 집착과 이탈 시 불안 수준을 측정합니다.", comingSoon: true },
  { id: "A-3", name: "성취중독 증후군 검사", category: "A", relatedSyndrome: "성취중독 증후군", description: "성취에 대한 과도한 집착과 자기가치를 성과에 결부시키는 경향을 측정합니다.", comingSoon: true },
  { id: "A-4", name: "실패공포 증후군 검사", category: "A", relatedSyndrome: "실패공포 증후군", description: "실패에 대한 두려움이 학습과 도전을 회피하게 만드는 정도를 측정합니다.", comingSoon: true },
  { id: "A-5", name: "자기비하 증후군 검사", category: "A", relatedSyndrome: "자기비하 증후군", description: "자기 가치에 대한 부정적 인식과 자기비하적 사고 패턴을 측정합니다.", comingSoon: true },
  { id: "A-6", name: "학습 강박 증후군 검사", category: "A", relatedSyndrome: "학습 강박 증후군", description: "학습에 대한 강박적 태도와 쉬지 못하는 불안 수준을 측정합니다.", comingSoon: true },
  { id: "B-1", name: "만성피로 증후군 검사", category: "B", relatedSyndrome: "만성피로 증후군", description: "지속적인 피로감과 회복 불능 상태의 정도를 측정합니다.", comingSoon: true },
  { id: "B-2", name: "분노조절 곤란 증후군 검사", category: "B", relatedSyndrome: "분노조절 곤란 증후군", description: "학업 스트레스로 인한 분노 표현과 조절 곤란 수준을 측정합니다.", comingSoon: true },
  { id: "B-3", name: "소진 증후군 검사", category: "B", relatedSyndrome: "소진 증후군", description: "에너지 고갈과 정서적·신체적 소진 수준을 측정합니다.", comingSoon: true },
  { id: "B-4", name: "예상불안 증후군 검사", category: "B", relatedSyndrome: "예상불안 증후군", description: "미래에 대한 과도한 걱정과 예기 불안 수준을 측정합니다.", comingSoon: true },
  { id: "B-5", name: "자기정체감 혼란 증후군 검사", category: "B", relatedSyndrome: "자기정체감 혼란 증후군", description: "자기 정체성과 진로에 대한 혼란 및 불확실감을 측정합니다.", comingSoon: true },
  { id: "B-6", name: "학습회피 증후군 검사", category: "B", relatedSyndrome: "학습회피 증후군", description: "학습 자체를 회피하거나 시작하지 못하는 경향을 측정합니다.", comingSoon: true },
  { id: "C", name: "긴장성 근육통 증후군 검사", category: "C", relatedSyndrome: "긴장성 근육통 증후군", description: "스트레스로 인한 신체 긴장과 근육통 수준을 측정합니다.", comingSoon: true },
  { id: "C-1", name: "무대공포 증후군 검사", category: "C", relatedSyndrome: "무대공포 증후군", description: "발표·면접 등 공개 상황에서의 공포와 회피 수준을 측정합니다.", comingSoon: true },
  { id: "C-2", name: "비교열등감 증후군 검사", category: "C", relatedSyndrome: "비교열등감 증후군", description: "타인과의 비교에서 오는 열등감과 자기가치 저하를 측정합니다.", comingSoon: true },
  { id: "C-3", name: "수면장애 증후군 검사", category: "C", relatedSyndrome: "수면장애 증후군", description: "학업 스트레스로 인한 수면의 질 저하와 불면 수준을 측정합니다.", comingSoon: true },
  { id: "C-5", name: "정보과부하 증후군 검사", category: "C", relatedSyndrome: "정보과부하 증후군", description: "과도한 정보 수집으로 인한 혼란과 의사결정 곤란을 측정합니다.", comingSoon: true },
  { id: "D", name: "낮은 자기효능감 증후군 검사", category: "D", relatedSyndrome: "낮은 자기효능감 증후군", description: "자신의 능력에 대한 낮은 기대와 무력감 수준을 측정합니다.", comingSoon: true },
  { id: "D-1", name: "미루기 증후군 검사", category: "D", relatedSyndrome: "미루기 증후군", description: "과제와 학습을 습관적으로 미루는 경향과 그에 따른 불안을 측정합니다.", comingSoon: true },
  { id: "D-2", name: "사회적 위축 증후군 검사", category: "D", relatedSyndrome: "사회적 위축 증후군", description: "대인관계 회피와 사회적 고립 수준을 측정합니다.", comingSoon: true },
  { id: "D-3", name: "시간 강박 증후군 검사", category: "D", relatedSyndrome: "시간 강박 증후군", description: "시간 부족에 대한 과도한 불안과 강박적 시간 관리 경향을 측정합니다.", comingSoon: true },
  { id: "D-5", name: "정서기복 증후군 검사", category: "D", relatedSyndrome: "정서기복 증후군", description: "감정의 급격한 변화와 정서 조절 어려움을 측정합니다.", comingSoon: true },
  { id: "E", name: "두통·편두통 증후군 검사", category: "E", relatedSyndrome: "두통·편두통 증후군", description: "스트레스성 두통 및 편두통의 빈도와 강도를 측정합니다.", comingSoon: true },
  { id: "E-1", name: "백지 증후군 검사", category: "E", relatedSyndrome: "백지 증후군", description: "시험·발표 시 머릿속이 하얘지는 현상의 빈도와 심각도를 측정합니다.", comingSoon: true },
  { id: "E-2", name: "성취불안 증후군 검사", category: "E", relatedSyndrome: "성취불안 증후군", description: "성취 상황에서의 불안과 자기 의심 수준을 측정합니다.", comingSoon: true },
  { id: "E-4", name: "위장관 증후군 검사", category: "E", relatedSyndrome: "위장관 증후군", description: "스트레스로 인한 소화기 증상(복통, 설사, 구토 등)의 빈도와 심각도를 측정합니다.", comingSoon: true },
  { id: "E-5", name: "집중력 결핍 증후군 검사", category: "E", relatedSyndrome: "집중력 결핍 증후군", description: "학습 중 주의력 저하와 집중 유지 어려움의 정도를 측정합니다.", comingSoon: true },
];

// ─── 32가지 증후군 ──────────────────────────────────────────

export const syndromes: Syndrome[] = [
  {
    id: 1,
    code: "A",
    name: "FOMO 증후군",
    category: "A",
    description: "SNS와 타인 비교에서 오는 소외 불안으로 집중력과 자기 통제력이 저하되는 상태",
    causes: ["SNS 과다 사용", "또래 비교 문화", "정보 과잉 환경", "불안정한 자기 정체감"],
    symptoms: ["끊임없는 SNS 확인", "비교로 인한 조급함", "집중력 저하", "디지털 기기 의존"],
    solutions: ["디지털 디톡스 시간 설정", "자기 속도 인정 연습", "비교 대신 성장 일지 작성", "오프라인 활동 확대"],
  },
  {
    id: 2,
    code: "B",
    name: "강박적 공부 증후군",
    category: "B",
    description: "완벽한 학습 수행에 대한 강박과 불안이 오히려 학습 효율을 떨어뜨리는 상태",
    causes: ["완벽주의 성향", "실패에 대한 과도한 두려움", "부모·교사의 높은 기대", "자기가치를 성적에 결부"],
    symptoms: ["계획 미달 시 극심한 불안", "쉬지 못하는 강박", "자기비판적 사고", "자기조절 결핍"],
    solutions: ["유연한 계획 수립 연습", "'충분히 잘했다' 자기 대화", "완벽 대신 '최선' 기준 재설정", "의도적 휴식 스케줄링"],
  },
  {
    id: 3,
    code: "C",
    name: "긴장성 근육통 증후군",
    category: "C",
    description: "장시간 학습과 스트레스로 인해 목, 어깨, 허리 등에 만성적 근육 긴장이 나타나는 상태",
    causes: ["장시간 부적절한 자세", "정신적 긴장의 신체화", "운동 부족", "수면 부족"],
    symptoms: ["목·어깨 뻣뻣함", "두통 동반 근육통", "손저림", "자세 불균형"],
    solutions: ["50분 공부 + 10분 스트레칭 루틴", "인체공학적 학습 환경 조성", "규칙적 유산소 운동", "근이완 호흡법 실천"],
  },
  {
    id: 4,
    code: "D",
    name: "낮은 자기효능감 증후군",
    category: "D",
    description: "자신의 능력에 대한 확신이 부족하여 도전을 회피하고 쉽게 좌절하는 상태",
    causes: ["반복된 실패 경험", "부정적 피드백 누적", "비교 환경", "성공 경험 부족"],
    symptoms: ["'나는 못해'라는 자동적 사고", "새로운 과제 회피", "작은 실패에 과민 반응", "동기 저하"],
    solutions: ["작은 성공 경험 쌓기", "성취 일지 작성", "구체적 단기 목표 설정", "자기 격려 연습"],
  },
  {
    id: 5,
    code: "E",
    name: "두통·편두통 증후군",
    category: "E",
    description: "학업 스트레스가 신체 증상으로 전환되어 반복적 두통이 나타나는 상태",
    causes: ["과도한 정신적 부하", "수면 불규칙", "카페인 과다 섭취", "눈의 피로"],
    symptoms: ["반복적 두통", "집중 시 통증 악화", "시각 과민", "구역감 동반"],
    solutions: ["규칙적 수면 습관", "적절한 휴식과 수분 섭취", "눈 건강 관리", "스트레스 관리 기법 습득"],
  },
  {
    id: 6,
    code: "A-1",
    name: "루틴 강박 증후군",
    category: "A",
    description: "일상 루틴이 조금이라도 어긋나면 극심한 불안을 느끼는 상태",
    causes: ["통제 욕구", "불확실성에 대한 불안", "경직된 사고방식", "완벽주의"],
    symptoms: ["루틴 이탈 시 극심한 불안", "융통성 부족", "변화 거부", "계획 집착"],
    solutions: ["의도적 루틴 변경 연습", "유연성 훈련", "불확실성 수용 연습", "마음챙김 명상"],
  },
  {
    id: 7,
    code: "A-3",
    name: "성취중독 증후군",
    category: "A",
    description: "성과와 결과에 과도하게 집착하여 자기 가치를 성취에만 결부시키는 상태",
    causes: ["조건부 사랑 경험", "성과 중심 환경", "자기 정체감 미확립", "외적 보상 의존"],
    symptoms: ["끝없는 목표 추구", "성취 후에도 공허함", "휴식에 대한 죄책감", "타인 인정 갈구"],
    solutions: ["과정 중심 사고 전환", "자기 가치 다각화", "무조건적 자기 수용 연습", "의미 있는 여가 활동"],
  },
  {
    id: 8,
    code: "A-4",
    name: "실패공포 증후군",
    category: "A",
    description: "실패에 대한 극심한 두려움으로 도전 자체를 회피하는 상태",
    causes: ["실패에 대한 과잉 처벌 경험", "완벽주의", "자기 가치를 결과에 연결", "실패 후 회복 경험 부족"],
    symptoms: ["도전 회피", "시작 전 포기", "실패 상상에 압도됨", "안전 영역에만 머무름"],
    solutions: ["실패를 학습 기회로 재해석", "작은 도전부터 시작", "실패 후 회복 경험 축적", "성장 마인드셋 훈련"],
  },
  {
    id: 9,
    code: "A-5",
    name: "자기비하 증후군",
    category: "A",
    description: "자기 자신에 대해 지속적으로 부정적 평가를 내리는 상태",
    causes: ["부정적 양육 경험", "반복된 비난 경험", "비교 문화", "낮은 자존감"],
    symptoms: ["'나는 부족해'라는 반복 사고", "자기 폄하 발언", "칭찬 거부", "자기 가치 부정"],
    solutions: ["자기 긍정 확언 연습", "강점 탐색 및 기록", "자기 친절(Self-Compassion) 훈련", "부정적 자기 대화 인식 및 전환"],
  },
  {
    id: 10,
    code: "A-2",
    name: "번아웃 증후군",
    category: "A",
    description: "지속된 학업 스트레스로 정서적 소진, 냉소, 무력감이 나타나는 상태",
    causes: ["장기적 과부하", "휴식 없는 학습", "성과 압박", "자기 돌봄 부재"],
    symptoms: ["정서적 소진", "학습에 대한 냉소", "성취감 상실", "만성 피로"],
    solutions: ["충분한 수면과 휴식 확보", "학습량 현실적 조절", "자기 돌봄 루틴 수립", "사회적 지지 활용"],
  },
  {
    id: 11,
    code: "B-2",
    name: "분노조절 곤란 증후군",
    category: "B",
    description: "학업 스트레스가 분노로 표출되어 대인관계와 학습에 지장을 주는 상태",
    causes: ["억압된 감정 누적", "스트레스 해소 방법 부재", "좌절 경험 반복", "감정 조절 기술 부족"],
    symptoms: ["작은 일에 폭발적 분노", "짜증과 적대감", "공격적 언행", "후회와 자책의 반복"],
    solutions: ["분노 신호 인식 훈련", "감정 일지 작성", "이완 기법 습득", "비폭력 의사소통 연습"],
  },
  {
    id: 12,
    code: "C-2",
    name: "비교열등감 증후군",
    category: "C",
    description: "타인과의 끊임없는 비교에서 열등감과 자기 가치 하락을 경험하는 상태",
    causes: ["경쟁 중심 교육 환경", "SNS 비교 문화", "조건부 자기 가치감", "타인 기준 내면화"],
    symptoms: ["끊임없는 비교", "열등감", "시기와 질투", "자기 가치 하락"],
    solutions: ["자기 기준 재설정", "비교 대상 줄이기", "고유한 강점 탐색", "감사 일지 작성"],
  },
  {
    id: 13,
    code: "D-2",
    name: "사회적 위축 증후군",
    category: "D",
    description: "학업 스트레스와 낮은 자존감으로 대인관계를 회피하고 고립되는 상태",
    causes: ["사회적 불안", "거절 경험", "낮은 사회적 자기효능감", "과도한 자의식"],
    symptoms: ["대인관계 회피", "혼자 있기 선호", "소통 어려움", "사회적 고립감"],
    solutions: ["안전한 사회적 상호작용 경험", "사회 기술 훈련", "소규모 그룹 활동 참여", "자기 표현 연습"],
  },
  {
    id: 14,
    code: "E-2",
    name: "성취불안 증후군",
    category: "E",
    description: "성취 상황에서 과도한 불안으로 실력 발휘가 어려운 상태",
    causes: ["높은 기대 부담", "실패 경험 트라우마", "자기 의심", "결과 중심 사고"],
    symptoms: ["성취 상황에서의 과도한 긴장", "실력 발휘 저하", "자기 의심", "회피 행동"],
    solutions: ["수행 불안 관리 기법", "점진적 노출 연습", "자기 효능감 강화", "과정 중심 평가"],
  },
  {
    id: 15,
    code: "A-3",
    name: "성취중독 증후군",
    category: "A",
    description: "성과에 대한 과도한 집착으로 자기 가치를 성취에만 결부시키는 상태",
    causes: ["조건부 인정 경험", "성과 중심 문화", "자기 정체성 미확립", "외적 동기 의존"],
    symptoms: ["끝없는 목표 추구", "성취 후 공허함", "휴식 시 죄책감", "자기가치=성적 등식"],
    solutions: ["내재적 동기 탐색", "자기가치 다원화", "과정 즐기기 연습", "의미 있는 여가 활동"],
  },
  {
    id: 16,
    code: "B-3",
    name: "소진 증후군",
    category: "B",
    description: "신체적·정서적 에너지가 완전히 고갈되어 회복이 어려운 상태",
    causes: ["지속적 과부하", "경계 설정 실패", "자기 돌봄 부재", "외부 요구에 과잉 순응"],
    symptoms: ["극심한 피로", "무감각", "동기 상실", "신체 증상 동반"],
    solutions: ["에너지 관리 전략 수립", "경계 설정 연습", "회복 루틴 구축", "도움 요청하기"],
  },
  {
    id: 17,
    code: "C-3",
    name: "수면장애 증후군",
    category: "C",
    description: "학업 스트레스로 인해 수면의 질이 심각하게 저하된 상태",
    causes: ["야간 과다 학습", "불안·걱정으로 인한 각성", "불규칙한 수면 스케줄", "카페인·스마트폰 과다 사용"],
    symptoms: ["입면 곤란", "수면 중 각성", "아침 피로감", "주간 졸음"],
    solutions: ["수면 위생 교육", "취침 전 루틴 수립", "카페인·블루라이트 제한", "이완 기법 적용"],
  },
  {
    id: 18,
    code: "D-3",
    name: "시간 강박 증후군",
    category: "D",
    description: "시간 부족에 대한 과도한 불안으로 강박적으로 시간을 관리하려는 상태",
    causes: ["촉박한 학습 일정", "완벽주의적 시간 계획", "시간 낭비에 대한 죄책감", "비현실적 기대"],
    symptoms: ["시간 강박", "쉬는 시간에도 초조함", "시간표 과밀 편성", "유연성 결여"],
    solutions: ["현실적 시간 계획 수립", "버퍼 시간 확보", "시간에 대한 인지 재구성", "여유 시간의 가치 인식"],
  },
  {
    id: 19,
    code: "E-3",
    name: "시험불안 증후군",
    category: "E",
    description: "시험 전후로 인지적·정서적·행동적 불안이 과도하게 나타나는 상태",
    causes: ["시험 결과에 대한 과도한 의미 부여", "과거 시험 실패 경험", "불안 대처 기술 부족", "완벽주의"],
    symptoms: ["시험 전 극심한 긴장", "기억 인출 곤란", "신체 증상(두근거림, 발한)", "회피 행동"],
    solutions: ["시험 불안 관리 기법 학습", "모의 시험 반복 노출", "이완 훈련", "인지 재구성"],
  },
  {
    id: 20,
    code: "A-4",
    name: "실패공포 증후군",
    category: "A",
    description: "실패에 대한 극심한 공포로 도전을 회피하고 안전한 영역에만 머무는 상태",
    causes: ["실패 시 처벌·비난 경험", "완벽주의", "자기가치=성과 등식", "회복 경험 부족"],
    symptoms: ["도전 회피", "안전 지향", "실패 상상 과잉", "시작 전 포기"],
    solutions: ["실패 재해석 훈련", "작은 도전 축적", "성장 마인드셋 교육", "실패 경험 나누기"],
  },
  {
    id: 21,
    code: "B-4",
    name: "예상불안 증후군",
    category: "B",
    description: "아직 일어나지 않은 미래 상황에 대해 과도하게 걱정하는 상태",
    causes: ["불확실성 비수용", "과거 부정적 경험 일반화", "통제 욕구", "비관적 사고 패턴"],
    symptoms: ["'만약에~'라는 반복 사고", "미래 걱정에 현재 집중 불가", "불면", "신체 긴장"],
    solutions: ["걱정 시간 한정하기", "현재 순간 집중 훈련", "최악의 시나리오 현실 점검", "마음챙김 명상"],
  },
  {
    id: 22,
    code: "C-4",
    name: "완벽주의 증후군",
    category: "C",
    description: "비현실적으로 높은 기준을 설정하고 이에 미치지 못할 때 극심한 고통을 느끼는 상태",
    causes: ["높은 부모 기대", "조건부 인정 경험", "실수에 대한 과잉 처벌", "경쟁 환경"],
    symptoms: ["비현실적 기준", "실수에 대한 과민 반응", "자기비판", "경직된 사고"],
    solutions: ["'충분히 좋은(good enough)' 기준 연습", "실수 허용 훈련", "자기 자비 연습", "유연한 사고 훈련"],
  },
  {
    id: 23,
    code: "D-4",
    name: "우울 증후군",
    category: "D",
    description: "지속적인 정서적 침체, 부정적 사고, 무력감으로 일상과 학습이 어려운 상태",
    causes: ["장기적 스트레스", "사회적 고립", "반복된 좌절 경험", "자기 돌봄 부재"],
    symptoms: ["지속적 우울감", "흥미 상실", "무기력", "자기비판적 사고"],
    solutions: ["전문 상담 연결", "행동 활성화 기법", "사회적 연결 강화", "규칙적 생활 리듬 회복"],
  },
  {
    id: 24,
    code: "E-4",
    name: "위장관 증후군",
    category: "E",
    description: "스트레스가 소화기 증상으로 나타나는 심인성 신체 반응 상태",
    causes: ["장-뇌 축(Gut-Brain Axis) 활성화", "만성 스트레스", "불규칙한 식습관", "불안·긴장"],
    symptoms: ["복통", "설사 또는 변비", "구역감", "식욕 변화"],
    solutions: ["규칙적 식사", "스트레스 관리", "장 건강 식단", "이완 기법 적용"],
  },
  {
    id: 25,
    code: "A-5",
    name: "자기비하 증후군",
    category: "A",
    description: "자기 자신에 대해 지속적으로 부정적 평가를 내려 자존감이 크게 저하된 상태",
    causes: ["부정적 양육 환경", "비난·무시 경험 누적", "비교 문화", "내면화된 비판적 목소리"],
    symptoms: ["자기 폄하", "칭찬 수용 곤란", "자기 가치 부정", "위축된 행동"],
    solutions: ["강점 기반 자기 탐색", "자기 긍정 확언", "자기 자비 훈련", "긍정적 자기 대화 연습"],
  },
  {
    id: 26,
    code: "B-5",
    name: "자기정체감 혼란 증후군",
    category: "B",
    description: "자신이 누구인지, 무엇을 원하는지 혼란스러워하며 진로와 가치관이 불분명한 상태",
    causes: ["탐색 경험 부족", "타인 기준에 맞추려는 습관", "정체성 발달 과제 미완", "다양한 역할 갈등"],
    symptoms: ["진로 불확실감", "가치관 혼란", "'나는 누구인가' 반복 질문", "결정 곤란"],
    solutions: ["자기 탐색 활동", "가치관 명료화 작업", "다양한 경험 시도", "멘토링·상담 활용"],
  },
  {
    id: 27,
    code: "C-5",
    name: "정보과부하 증후군",
    category: "C",
    description: "과도한 정보 수집에 매몰되어 핵심을 놓치고 의사결정이 어려운 상태",
    causes: ["인터넷 정보 과잉", "불안에 의한 정보 탐색", "의사결정 회피", "완벽주의적 정보 수집"],
    symptoms: ["정보 수집에 과도한 시간 소비", "핵심 파악 곤란", "결정 지연", "정보 피로"],
    solutions: ["정보 수집 시간 제한", "핵심 정보 필터링 기준 수립", "의사결정 연습", "정보 단식 시간 설정"],
  },
  {
    id: 28,
    code: "D-5",
    name: "정서기복 증후군",
    category: "D",
    description: "감정이 급격하게 변하여 안정적인 학습과 대인관계 유지가 어려운 상태",
    causes: ["정서 조절 기술 부족", "스트레스 누적", "호르몬 변화", "불안정한 환경"],
    symptoms: ["급격한 감정 변화", "사소한 일에 과민 반응", "감정 폭발", "감정 후 탈진"],
    solutions: ["감정 인식 및 명명 연습", "감정 일지 작성", "감정 조절 기법 학습", "규칙적 생활 리듬 유지"],
  },
  {
    id: 29,
    code: "E-5",
    name: "집중력 결핍 증후군",
    category: "E",
    description: "학습 중 주의력이 지속적으로 저하되어 효율적 학습이 어려운 상태",
    causes: ["수면 부족", "스마트폰 과다 사용", "멀티태스킹 습관", "동기 저하"],
    symptoms: ["짧은 집중 시간", "쉬운 산만함", "과제 전환 곤란", "학습 내용 기억 곤란"],
    solutions: ["포모도로 기법 활용", "학습 환경 정리", "디지털 기기 분리", "집중력 훈련 프로그램"],
  },
  {
    id: 30,
    code: "D-1",
    name: "미루기 증후군",
    category: "D",
    description: "해야 할 과제를 습관적으로 미루면서 불안과 죄책감이 증가하는 악순환 상태",
    causes: ["실패 공포", "완벽주의", "자기 조절력 부족", "과제 난이도 회피"],
    symptoms: ["시작 지연", "마감 직전 몰아치기", "회피 행동", "죄책감-미루기 악순환"],
    solutions: ["5분 시작 규칙", "과제 분할 전략", "실행 의도(Implementation Intention) 설정", "보상 시스템 활용"],
  },
  {
    id: 31,
    code: "A-6",
    name: "학습 강박 증후군",
    category: "A",
    description: "학습을 멈추면 불안해지고 쉬지 못하는 강박적 학습 상태",
    causes: ["불안 회피 수단으로의 학습", "성과 압박", "자기 가치를 학습량에 연결", "통제 욕구"],
    symptoms: ["쉬지 못함", "학습량 강박", "쉬면 불안", "신체 신호 무시"],
    solutions: ["의도적 휴식 연습", "학습-휴식 균형 재설정", "불안 내성 훈련", "자기 돌봄 우선순위 설정"],
  },
  {
    id: 32,
    code: "B-6",
    name: "학습회피 증후군",
    category: "B",
    description: "학습 자체에 대한 부정적 감정으로 공부를 시작하거나 지속하기 어려운 상태",
    causes: ["반복된 학습 실패", "학습 무력감", "흥미 상실", "부정적 학습 경험"],
    symptoms: ["공부 시작 곤란", "회피 행동 증가", "대체 활동 몰두", "학습 관련 부정 정서"],
    solutions: ["작은 성공 경험 설계", "흥미 기반 학습 접근", "학습 환경 재구성", "동기 면담 기법 활용"],
  },
  {
    id: 33,
    code: "B-1",
    name: "만성피로 증후군",
    category: "B",
    description: "지속적인 피로감이 휴식으로 회복되지 않아 일상과 학습에 지장을 주는 상태",
    causes: ["수면 부족·불규칙", "과도한 학습량", "영양 불균형", "운동 부족"],
    symptoms: ["만성적 피로감", "집중력 저하", "무기력", "신체 통증 동반"],
    solutions: ["수면 위생 개선", "규칙적 운동", "균형 잡힌 식단", "에너지 관리 전략"],
  },
  {
    id: 34,
    code: "C-1",
    name: "무대공포 증후군",
    category: "C",
    description: "발표, 면접 등 공개 상황에서 극심한 공포와 회피 반응을 보이는 상태",
    causes: ["과거 창피한 경험", "부정적 평가에 대한 공포", "사회불안", "자기의식 과잉"],
    symptoms: ["공개 상황 극심한 긴장", "목소리 떨림·얼굴 붉어짐", "발표 회피", "사전 과도한 걱정"],
    solutions: ["점진적 노출 훈련", "호흡·이완 기법", "인지 재구성", "모의 발표 연습"],
  },
  {
    id: 35,
    code: "E-1",
    name: "백지 증후군",
    category: "E",
    description: "시험이나 발표 시 머릿속이 하얘져서 학습한 내용이 전혀 떠오르지 않는 상태",
    causes: ["극심한 불안에 의한 기억 차단", "과도한 긴장", "수면 부족", "과잉 학습에 의한 간섭"],
    symptoms: ["기억 인출 실패", "순간적 사고 정지", "패닉 반응", "시험 후 내용 회상 가능"],
    solutions: ["시험 불안 관리", "인출 연습(Retrieval Practice)", "이완 기법 훈련", "시험 전 루틴 수립"],
  },
];

// ─── 채점 해석 가이드 ───────────────────────────────────────

export const scoringGuide: ScoringGuide = {
  totalQuestions: 20,
  pointsPerQuestion: 5,
  minScore: 20,
  maxScore: 100,
  timeLimitMinutes: 3,
  reverseScoringNote:
    "역문항(Q16-Q20)은 채점 시 점수를 반전합니다: 1→5, 2→4, 3→3, 4→2, 5→1",
  ranges: [
    {
      min: 20,
      max: 40,
      level: "safe",
      label: "양호",
      description:
        "현재 심리 상태가 안정적입니다. 해당 증후군의 영향을 거의 받지 않고 있으며, 건강한 자기 관리가 이루어지고 있습니다.",
      recommendation:
        "현재의 좋은 습관을 유지하세요. 정기적인 자기 점검을 통해 지속적으로 관리하면 좋겠습니다.",
    },
    {
      min: 41,
      max: 60,
      level: "caution",
      label: "주의",
      description:
        "해당 증후군의 초기 징후가 나타나고 있습니다. 일부 영역에서 스트레스 반응이 관찰되며, 적절한 관리가 필요한 시점입니다.",
      recommendation:
        "AI 코치와 함께 해당 증후군에 대한 자기 이해를 높이고, 일상에서 실천할 수 있는 관리 전략을 시작해 보세요.",
    },
    {
      min: 61,
      max: 80,
      level: "warning",
      label: "관리 필요",
      description:
        "해당 증후군이 일상과 학습에 상당한 영향을 미치고 있습니다. 적극적인 개입과 관리가 필요합니다.",
      recommendation:
        "AI 코칭 프로그램을 적극 활용하고, 학원 상담 선생님이나 학교 상담사와 상담을 병행하는 것을 권장합니다.",
    },
    {
      min: 81,
      max: 100,
      level: "danger",
      label: "전문 상담 권고",
      description:
        "해당 증후군이 심각한 수준으로 나타나고 있습니다. 전문적인 심리 상담이 필요한 상태입니다.",
      recommendation:
        "전문 심리상담사 또는 정신건강 전문가와의 상담을 강력히 권장합니다. 혼자 해결하려 하지 말고, 신뢰할 수 있는 어른에게 도움을 요청하세요.",
    },
  ],
};

// ─── 위험 신호 키워드 ───────────────────────────────────────

export const crisisKeywords: CrisisKeyword[] = [
  // 자해 관련
  { keyword: "자해", severity: "critical" },
  { keyword: "자해하고 싶", severity: "critical" },
  { keyword: "손목을 긋", severity: "critical" },
  { keyword: "상처를 내", severity: "critical" },
  { keyword: "몸에 상처", severity: "critical" },
  { keyword: "스스로를 해치", severity: "critical" },
  { keyword: "자기 파괴", severity: "critical" },
  { keyword: "아프게 하고 싶", severity: "critical" },
  { keyword: "피를 보고 싶", severity: "critical" },
  { keyword: "칼로 긋", severity: "critical" },
  // 자살 관련
  { keyword: "죽고 싶", severity: "critical" },
  { keyword: "죽었으면", severity: "critical" },
  { keyword: "살고 싶지 않", severity: "critical" },
  { keyword: "자살", severity: "critical" },
  { keyword: "목숨을 끊", severity: "critical" },
  { keyword: "세상을 떠나고 싶", severity: "critical" },
  { keyword: "사라지고 싶", severity: "critical" },
  { keyword: "없어지고 싶", severity: "critical" },
  { keyword: "인생이 끝났", severity: "critical" },
  { keyword: "더 이상 못 살겠", severity: "critical" },
  { keyword: "삶을 포기", severity: "critical" },
  { keyword: "유서", severity: "critical" },
  { keyword: "마지막 인사", severity: "critical" },
  { keyword: "다시 태어나고 싶", severity: "high" },
  // 극단적 무력감
  { keyword: "아무 의미 없", severity: "high" },
  { keyword: "살아서 뭐하나", severity: "critical" },
  { keyword: "존재 가치가 없", severity: "high" },
  { keyword: "나 없어도 아무도 모를", severity: "high" },
  { keyword: "모든 게 끝났", severity: "high" },
  { keyword: "희망이 없", severity: "high" },
];

// ─── AI 코칭 샘플 대화 ──────────────────────────────────────

export const coachingDialogs: CoachingDialog[] = [
  // FOMO 증후군 샘플 대화
  {
    syndromeId: 1,
    syndromeName: "FOMO 증후군",
    turns: [
      {
        role: "user",
        message:
          "친구들이 올린 공부 인증 보면 나만 놀고 있는 것 같아서 너무 불안해요. SNS를 끊어야 할까요?",
      },
      {
        role: "coach",
        message:
          "친구들의 공부 인증을 보면서 불안감을 느끼는 건 자연스러운 감정이에요. 먼저 알아두면 좋은 것이 있는데요 — SNS에 올라오는 것은 그 사람의 '가장 잘한 순간'만 편집된 것이에요. 실제로 모든 시간을 공부하는 사람은 거의 없답니다. SNS를 완전히 끊기보다는, '공부 시간에는 알림 끄기'처럼 자신만의 규칙을 만들어 보면 어떨까요?",
      },
      {
        role: "user",
        message:
          "그래도 안 보려고 해도 자꾸 보게 돼요. 의지가 부족한 걸까요?",
      },
      {
        role: "coach",
        message:
          "의지력 문제가 아니에요. SNS는 뇌의 보상 회로를 자극하도록 설계되어 있어서 누구나 끌리게 되어 있답니다. 중요한 건 '의지'가 아니라 '환경 설계'예요. 예를 들어, 공부할 때 스마트폰을 다른 방에 두거나, 공부 시간에만 앱을 차단하는 앱을 활용해 보세요. 그리고 SNS 대신 나만의 작은 성취를 기록하는 '성장 일지'를 써보면, 비교 대신 내 성장에 집중할 수 있게 됩니다.",
      },
    ],
  },

  // 번아웃 증후군 샘플 대화
  {
    syndromeId: 10,
    syndromeName: "번아웃 증후군",
    turns: [
      {
        role: "user",
        message:
          "공부를 시작하려고만 하면 이미 지쳐 있는 느낌이에요. 쉬어도 안 쉬어지고, 공부해도 머리에 안 들어오고... 어떻게 해야 하죠?",
      },
      {
        role: "coach",
        message:
          "지금 느끼는 것은 번아웃의 전형적인 신호예요. '쉬어도 회복되지 않는 피로'가 핵심 특징이거든요. 이건 의지력이나 체력의 문제가 아니라, 정서적 에너지가 바닥난 상태입니다. 지금 가장 중요한 건 '더 열심히'가 아니라 '제대로 쉬기'예요. 오늘 하루, 공부량을 평소의 절반으로 줄이고, 대신 좋아하는 활동을 30분이라도 해보는 건 어떨까요?",
      },
      {
        role: "user",
        message: "근데 쉬면 더 불안해져요. 다른 애들은 다 공부하고 있을 텐데...",
      },
      {
        role: "coach",
        message:
          "쉬면 불안해지는 마음, 충분히 이해해요. 하지만 생각해 볼까요? 지금 상태로 억지로 공부해도 효율이 30%밖에 안 된다면, 제대로 쉬고 나서 80%의 효율로 공부하는 것이 훨씬 나은 전략이에요. 번아웃 회복의 첫 단계는 '쉬어도 괜찮다'는 허락을 자기 자신에게 주는 거예요. 회복은 게으름이 아니라 전략입니다. 오늘은 딱 3가지만 해보세요: 7시간 수면, 한 끼 제대로 먹기, 그리고 10분 산책. 이것부터 시작해 볼까요?",
      },
    ],
  },

  // 시험불안 증후군 샘플 대화
  {
    syndromeId: 19,
    syndromeName: "시험불안 증후군",
    turns: [
      {
        role: "user",
        message:
          "시험만 다가오면 머릿속이 하얘져요. 분명히 공부했는데 시험지 받으면 아무것도 기억이 안 나요. 저 진짜 이상한 건가요?",
      },
      {
        role: "coach",
        message:
          "전혀 이상한 게 아니에요. 이것은 시험불안이 만드는 매우 흔한 현상이에요. 불안이 극도로 높아지면 뇌의 '전전두엽'(기억과 판단을 담당하는 부분)이 일시적으로 기능이 저하돼요. 마치 컴퓨터가 과부하 걸려서 멈추는 것과 같아요. 공부를 안 해서가 아니라, 불안이 기억 인출을 방해하는 거예요. 시험 직전에 30초 동안 천천히 깊은 숨을 쉬어보세요. 이것만으로도 뇌의 불안 반응을 줄일 수 있답니다.",
      },
      {
        role: "user",
        message:
          "호흡이 도움이 되나요? 저는 시험 전날부터 잠도 못 자고 심장이 막 뛰어요.",
      },
      {
        role: "coach",
        message:
          "네, 호흡은 과학적으로 증명된 가장 빠른 불안 조절 방법이에요. 특히 '4-7-8 호흡법'을 추천해요: 4초 동안 들이쉬고, 7초 동안 참고, 8초 동안 내쉬는 거예요. 시험 전날 잠이 안 올 때도 이 방법을 쓰면 도움이 됩니다. 그리고 하나 더 알려드릴게요 — '시험 전 불안 쓰기(Expressive Writing)'라는 기법이 있어요. 시험 10분 전에 종이에 '지금 내가 느끼는 불안'을 5분간 자유롭게 적어보세요. 연구에 따르면 이것만으로도 시험 성적이 향상된다고 해요. 불안을 머릿속에서 종이 위로 옮기는 거예요.",
      },
    ],
  },
];

// ─── Helper: 역문항 점수 반전 ───────────────────────────────

export function reverseScore(score: number): number {
  return 6 - score; // 5점 리커트: 1↔5, 2↔4, 3↔3
}

/**
 * 총점 계산 (역문항 자동 반영)
 */
export function calculateTotalScore(
  answers: { questionId: number; score: number }[],
  questions: Question[]
): number {
  return answers.reduce((total, answer) => {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) return total;
    const adjustedScore = question.isReversed
      ? reverseScore(answer.score)
      : answer.score;
    return total + adjustedScore;
  }, 0);
}

/**
 * 점수대별 해석 조회
 */
export function getScoreInterpretation(totalScore: number): ScoreRange | null {
  return (
    scoringGuide.ranges.find(
      (range) => totalScore >= range.min && totalScore <= range.max
    ) ?? null
  );
}

/**
 * 하위영역별 점수 계산
 */
export function calculateSubdomainScores(
  answers: { questionId: number; score: number }[],
  questions: Question[]
): Record<string, { total: number; count: number; average: number }> {
  const subdomains: Record<string, { total: number; count: number }> = {};

  answers.forEach((answer) => {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) return;

    const adjustedScore = question.isReversed
      ? reverseScore(answer.score)
      : answer.score;

    if (!subdomains[question.subdomain]) {
      subdomains[question.subdomain] = { total: 0, count: 0 };
    }
    subdomains[question.subdomain].total += adjustedScore;
    subdomains[question.subdomain].count += 1;
  });

  const result: Record<
    string,
    { total: number; count: number; average: number }
  > = {};
  for (const [key, value] of Object.entries(subdomains)) {
    result[key] = {
      ...value,
      average: Math.round((value.total / value.count) * 100) / 100,
    };
  }
  return result;
}

/**
 * 위험 신호 감지
 */
export function detectCrisisKeywords(
  text: string
): { keyword: string; severity: "high" | "critical" }[] {
  const normalizedText = text.toLowerCase().replace(/\s+/g, "");
  return crisisKeywords.filter((ck) =>
    normalizedText.includes(ck.keyword.replace(/\s+/g, ""))
  );
}
