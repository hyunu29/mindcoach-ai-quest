// ============================================================
// 통합 심리검사 (게이트웨이) — 김종환 코치 원본 사양
// 50문항 / 10영역 × 5문항 / 5점 Likert / 영역별 25점 만점
// 영역 점수 ≥15 → 해당 영역의 전문 검사 추천
// ============================================================

import type { Question } from "./seed-data";

export interface IntegratedDomain {
  key: string;
  name: string;
  description: string;
  recommendedTestIds: string[];
}

export const INTEGRATED_TEST_ID = "INT";
export const DOMAIN_RECOMMEND_THRESHOLD = 15;
export const DOMAIN_QUESTION_COUNT = 5;
export const DOMAIN_MAX_SCORE = 25;

export const INTEGRATED_DOMAINS: IntegratedDomain[] = [
  {
    key: "emotional_instability",
    name: "정서적 불안정 및 우울",
    description: "감정 기복, 우울감, 비교열등감",
    recommendedTestIds: ["D-5", "B-2", "D-4", "C-2"],
  },
  {
    key: "test_stage_anxiety",
    name: "시험 및 무대 불안",
    description: "시험 직전 불안, 발표 공포",
    recommendedTestIds: ["E-3", "C-1", "B-4", "E-1", "E-2"],
  },
  {
    key: "learning_obsession",
    name: "학습 강박 및 완벽주의",
    description: "공부 강박, 성취중독, 자기비하",
    recommendedTestIds: ["A-6", "B", "A-3", "A-5"],
  },
  {
    key: "routine_time_control",
    name: "루틴 및 시간 통제",
    description: "루틴 집착, 시간 강박",
    recommendedTestIds: ["A-1", "D-3"],
  },
  {
    key: "cognitive_focus",
    name: "인지 및 집중력 저하",
    description: "집중력 결핍, 정보 과부하, 백지화",
    recommendedTestIds: ["E-5", "C-5", "E-1"],
  },
  {
    key: "learning_avoidance",
    name: "학습 회피 및 미루기",
    description: "학습 회피, 미루기, 실패 공포",
    recommendedTestIds: ["B-6", "D-1", "A-4"],
  },
  {
    key: "somatic_pain",
    name: "신체화 및 통증",
    description: "긴장성 통증, 두통, 위장 증상",
    recommendedTestIds: ["C", "E", "E-4"],
  },
  {
    key: "energy_burnout",
    name: "에너지 소진 및 번아웃",
    description: "만성피로, 번아웃, 소진감",
    recommendedTestIds: ["B-1", "A-2", "B-3"],
  },
  {
    key: "self_relationships",
    name: "자아 및 대인관계",
    description: "자기효능감 저하, 정체감 혼란, 사회적 위축",
    recommendedTestIds: ["D", "B-5", "D-2"],
  },
  {
    key: "sleep_routine",
    name: "수면 및 생활 루틴",
    description: "수면 불안, 불규칙한 생활 패턴",
    recommendedTestIds: ["C-3"],
  },
];

const Q = (id: number, text: string, key: string, name: string): Question => ({
  id,
  text,
  subdomain: name,
  subdomainEn: key,
  isReversed: false,
});

export const INTEGRATED_TEST_QUESTIONS: Question[] = [
  // 영역 1: 정서적 불안정 및 우울
  Q(1,  "하루에도 감정이 수시로 변해 갈피를 잡기 어렵다.",                                "emotional_instability", "정서적 불안정 및 우울"),
  Q(2,  "작은 일에도 쉽게 울컥하거나 화가 조절되지 않는다.",                                "emotional_instability", "정서적 불안정 및 우울"),
  Q(3,  "미래가 불투명하게 느껴지고 이유 없는 우울감이 지속된다.",                          "emotional_instability", "정서적 불안정 및 우울"),
  Q(4,  "나도 모르게 주변 사람과 나를 비교하며 비참함을 느낀다.",                            "emotional_instability", "정서적 불안정 및 우울"),
  Q(5,  "다른 사람들의 시선이나 평가에 지나치게 예민하게 반응한다.",                          "emotional_instability", "정서적 불안정 및 우울"),

  // 영역 2: 시험 및 무대 불안
  Q(6,  "시험 당일이나 발표를 앞두면 머릿속이 하얘지는 경험을 한다.",                          "test_stage_anxiety",   "시험 및 무대 불안"),
  Q(7,  "중요한 시험을 앞두고 예상치 못한 상황이 생길까 봐 늘 불안하다.",                       "test_stage_anxiety",   "시험 및 무대 불안"),
  Q(8,  "시험지만 받으면 심장이 두근거리고 배가 아프거나 손이 떨린다.",                          "test_stage_anxiety",   "시험 및 무대 불안"),
  Q(9,  "남들 앞에서 나를 드러내는 상황(발표 등)이 공포스럽다.",                                "test_stage_anxiety",   "시험 및 무대 불안"),
  Q(10, "시험을 망쳤을 때의 비극적인 시나리오를 자꾸 상상하게 된다.",                            "test_stage_anxiety",   "시험 및 무대 불안"),

  // 영역 3: 학습 강박 및 완벽주의
  Q(11, "공부를 쉬거나 잠시라도 딴짓을 하면 죄책감이 든다.",                                   "learning_obsession",   "학습 강박 및 완벽주의"),
  Q(12, "성적이 곧 내 존재의 가치라고 생각되어 성적 하락이 두렵다.",                            "learning_obsession",   "학습 강박 및 완벽주의"),
  Q(13, "피곤해도 정해진 공부량을 다 채우기 전까지는 멈출 수 없다.",                            "learning_obsession",   "학습 강박 및 완벽주의"),
  Q(14, "스스로 설정한 목표나 기준에 도달하지 못하면 자책이 심하다.",                            "learning_obsession",   "학습 강박 및 완벽주의"),
  Q(15, "공부 외의 모든 활동은 시간 낭비처럼 느껴져 즐기지 못한다.",                              "learning_obsession",   "학습 강박 및 완벽주의"),

  // 영역 4: 루틴 및 시간 통제
  Q(16, "하루 계획표를 세운 대로 완벽하게 지키지 못하면 매우 불안하다.",                          "routine_time_control", "루틴 및 시간 통제"),
  Q(17, "공부 순서나 방식이 내 루틴에서 벗어나면 집중이 아예 안 된다.",                            "routine_time_control", "루틴 및 시간 통제"),
  Q(18, "예기치 않은 일정 변화가 생기면 극심한 스트레스를 받는다.",                                "routine_time_control", "루틴 및 시간 통제"),
  Q(19, "시간에 쫓기는 기분을 자주 느끼며 일분일초를 강박적으로 관리한다.",                          "routine_time_control", "루틴 및 시간 통제"),
  Q(20, "계획을 짜는 데만 너무 많은 시간을 쏟거나 계획에 집착한다.",                                "routine_time_control", "루틴 및 시간 통제"),

  // 영역 5: 인지 및 집중력 저하
  Q(21, "공부를 시작해도 금세 딴생각이 나거나 집중이 안 된다.",                                    "cognitive_focus",      "인지 및 집중력 저하"),
  Q(22, "책을 읽어도 내용이 머리에 들어오지 않고 겉도는 느낌이다.",                                  "cognitive_focus",      "인지 및 집중력 저하"),
  Q(23, "새로운 정보를 받아들이는 것이 벅차고 머리가 과부하 된 것 같다.",                            "cognitive_focus",      "인지 및 집중력 저하"),
  Q(24, "주변의 소음이나 환경적 자극에 매우 예민하게 반응한다.",                                    "cognitive_focus",      "인지 및 집중력 저하"),
  Q(25, "기억력이 예전만 못하고 아는 내용도 시험 때는 기억이 안 난다.",                              "cognitive_focus",      "인지 및 집중력 저하"),

  // 영역 6: 학습 회피 및 미루기
  Q(26, "실패할까 봐 아예 공부를 시작하는 것조차 망설이게 된다.",                                  "learning_avoidance",   "학습 회피 및 미루기"),
  Q(27, "공부해야 하는 것을 알지만 자꾸 스마트폰이나 딴짓으로 도피한다.",                            "learning_avoidance",   "학습 회피 및 미루기"),
  Q(28, "완벽하게 해낼 자신이 없으면 차라리 미루는 것이 낫다고 생각한다.",                            "learning_avoidance",   "학습 회피 및 미루기"),
  Q(29, "\"어차피 해도 안 될 거야\"라는 무기력한 생각이 지배적이다.",                                  "learning_avoidance",   "학습 회피 및 미루기"),
  Q(30, "공부 시작 전 준비 과정(책상 정리 등)에만 에너지를 다 쓴다.",                                "learning_avoidance",   "학습 회피 및 미루기"),

  // 영역 7: 신체화 및 통증
  Q(31, "공부할 때 목, 어깨, 허리 등에 만성적인 통증을 느낀다.",                                    "somatic_pain",         "신체화 및 통증"),
  Q(32, "스트레스를 받으면 머리가 조이거나 찌르는 듯한 두통이 생긴다.",                              "somatic_pain",         "신체화 및 통증"),
  Q(33, "긴장하거나 집중하면 소화가 안 되고 배가 자주 아프다.",                                      "somatic_pain",         "신체화 및 통증"),
  Q(34, "눈이 침침하거나 어지러움, 머리가 먹먹한 느낌을 자주 받는다.",                                "somatic_pain",         "신체화 및 통증"),
  Q(35, "심리적인 긴장 상태가 몸의 통증으로 바로 이어진다.",                                        "somatic_pain",         "신체화 및 통증"),

  // 영역 8: 에너지 소진 및 번아웃
  Q(36, "잠을 자도 개운하지 않고 만성적인 피로에 시달린다.",                                        "energy_burnout",       "에너지 소진 및 번아웃"),
  Q(37, "예전에는 열정적이었는데 지금은 모든 의욕이 사라진 상태다.",                                  "energy_burnout",       "에너지 소진 및 번아웃"),
  Q(38, "공부를 지속할 에너지가 완전히 방전된 것 같은 기분이다.",                                    "energy_burnout",       "에너지 소진 및 번아웃"),
  Q(39, "쉬어도 피로가 풀리지 않고 몸이 천근만근 무겁다.",                                          "energy_burnout",       "에너지 소진 및 번아웃"),
  Q(40, "성취를 해도 기쁘기보다 허무함과 냉소적인 마음이 든다.",                                    "energy_burnout",       "에너지 소진 및 번아웃"),

  // 영역 9: 자아 및 대인관계
  Q(41, "\"나는 할 수 있다\"는 자신감보다 \"나는 안 될 거야\"라는 확신이 강하다.",                       "self_relationships",   "자아 및 대인관계"),
  Q(42, "나는 남들보다 부족하고 못난 사람이라는 생각이 자주 든다.",                                  "self_relationships",   "자아 및 대인관계"),
  Q(43, "내가 누구인지, 무엇을 위해 공부하는지 정체성이 혼란스럽다.",                                "self_relationships",   "자아 및 대인관계"),
  Q(44, "사람들을 만나는 것이 두렵거나 자꾸 혼자 숨고 싶어진다.",                                    "self_relationships",   "자아 및 대인관계"),
  Q(45, "주변 사람(가족, 친구)이 나를 한심하게 볼까 봐 두렵다.",                                    "self_relationships",   "자아 및 대인관계"),

  // 영역 10: 수면 및 생활 루틴
  Q(46, "잠자리에 들어도 공부 생각이나 걱정 때문에 쉽게 잠들지 못한다.",                              "sleep_routine",        "수면 및 생활 루틴"),
  Q(47, "자는 동안 자주 깨거나 꿈을 많이 꿔서 수면의 질이 낮다.",                                    "sleep_routine",        "수면 및 생활 루틴"),
  Q(48, "자고 나면 다음 날 공부를 못 할까 봐 잠자는 것조차 불안하다.",                                "sleep_routine",        "수면 및 생활 루틴"),
  Q(49, "불규칙한 생활 패턴 때문에 낮 시간에 졸음이 쏟아진다.",                                    "sleep_routine",        "수면 및 생활 루틴"),
  Q(50, "수면 부족이 학습 효율을 떨어뜨려 다시 불안해지는 악순환을 겪는다.",                          "sleep_routine",        "수면 및 생활 루틴"),
];
