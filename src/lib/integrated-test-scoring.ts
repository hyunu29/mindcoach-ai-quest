// ============================================================
// 통합 심리검사 채점 & 추천 알고리즘
// - 50문항, 10영역 × 5문항, 5점 Likert (역문항 없음)
// - 영역별 25점 만점, 영역 점수 ≥ 15점 → 해당 영역 전문검사 추천
// - 결과 페이로드는 test_results.recommendations(jsonb)에 저장
// ============================================================

import {
  DOMAIN_MAX_SCORE,
  DOMAIN_QUESTION_COUNT,
  DOMAIN_RECOMMEND_THRESHOLD,
  INTEGRATED_DOMAINS,
  INTEGRATED_TEST_QUESTIONS,
  type IntegratedDomain,
} from "@/data/integrated-test";

export interface IntegratedAnswer {
  questionId: number;
  answer: number;
}

export interface DomainScore {
  key: string;
  name: string;
  description: string;
  score: number;
  maxScore: number;
  percent: number;
  isHigh: boolean;
}

export interface DomainRecommendation {
  domain: string;
  domainName: string;
  score: number;
  recommendedTestIds: string[];
}

export interface IntegratedScoringResult {
  totalScore: number;
  maxTotalScore: number;
  domainScores: DomainScore[];
  subdomainScores: Record<string, number>;
  recommendations: DomainRecommendation[];
  topDomain: DomainScore | null;
  riskLevel: "safe" | "caution" | "warning" | "danger";
  riskLabel: string;
}

const TOTAL_QUESTIONS =
  INTEGRATED_DOMAINS.length * DOMAIN_QUESTION_COUNT;
const MAX_TOTAL_SCORE = INTEGRATED_DOMAINS.length * DOMAIN_MAX_SCORE;

function clampLikert(value: number): number {
  if (!Number.isFinite(value)) return 3;
  if (value < 1) return 1;
  if (value > 5) return 5;
  return Math.round(value);
}

function getRiskFromHighDomains(highCount: number): {
  level: IntegratedScoringResult["riskLevel"];
  label: string;
} {
  if (highCount === 0) return { level: "safe", label: "양호" };
  if (highCount <= 2) return { level: "caution", label: "주의" };
  if (highCount <= 4) return { level: "warning", label: "경계" };
  return { level: "danger", label: "위험" };
}

/**
 * answers 배열(인덱스 = 문항순서, 값 = 1~5점)을 받아
 * 도메인별 점수, 추천 후속검사, 리스크 레벨을 계산한다.
 *
 * - answers는 길이 50이 권장되지만, 빈 응답은 3점(중립)으로 처리.
 * - 통합검사 문항에는 역문항이 없으므로 raw score 그대로 사용.
 */
export function scoreIntegratedTest(
  answers: number[] | Record<number, number>,
): IntegratedScoringResult {
  const answerArray: number[] = Array.isArray(answers)
    ? answers
    : Array.from({ length: TOTAL_QUESTIONS }, (_, i) => answers[i] ?? 3);

  const domainTotals = new Map<string, number>();
  for (const d of INTEGRATED_DOMAINS) domainTotals.set(d.key, 0);

  INTEGRATED_TEST_QUESTIONS.forEach((q, i) => {
    const raw = clampLikert(answerArray[i] ?? 3);
    const score = q.isReversed ? 6 - raw : raw;
    const key = q.subdomainEn;
    domainTotals.set(key, (domainTotals.get(key) ?? 0) + score);
  });

  const domainScores: DomainScore[] = INTEGRATED_DOMAINS.map(
    (d: IntegratedDomain) => {
      const score = domainTotals.get(d.key) ?? 0;
      return {
        key: d.key,
        name: d.name,
        description: d.description,
        score,
        maxScore: DOMAIN_MAX_SCORE,
        percent: Math.round((score / DOMAIN_MAX_SCORE) * 100),
        isHigh: score >= DOMAIN_RECOMMEND_THRESHOLD,
      };
    },
  );

  // subdomain_scores(jsonb) 호환: 한글 도메인명 키로도 보관
  const subdomainScores: Record<string, number> = {};
  for (const ds of domainScores) subdomainScores[ds.name] = ds.score;

  const recommendations: DomainRecommendation[] = INTEGRATED_DOMAINS
    .filter((d) => (domainTotals.get(d.key) ?? 0) >= DOMAIN_RECOMMEND_THRESHOLD)
    .map((d) => ({
      domain: d.key,
      domainName: d.name,
      score: domainTotals.get(d.key) ?? 0,
      recommendedTestIds: d.recommendedTestIds,
    }))
    .sort((a, b) => b.score - a.score);

  const totalScore = domainScores.reduce((sum, d) => sum + d.score, 0);
  const topDomain =
    domainScores.length === 0
      ? null
      : [...domainScores].sort((a, b) => b.score - a.score)[0];

  const highCount = domainScores.filter((d) => d.isHigh).length;
  const { level, label } = getRiskFromHighDomains(highCount);

  return {
    totalScore,
    maxTotalScore: MAX_TOTAL_SCORE,
    domainScores,
    subdomainScores,
    recommendations,
    topDomain,
    riskLevel: level,
    riskLabel: label,
  };
}

/**
 * UI에 그대로 노출할 수 있는 게이트웨이 메시지.
 * 김종환 코치 원본 사양:
 *   "당신은 현재 [OO 영역]의 심리적 에너지가 많이 소모된 상태입니다.
 *    더 구체적인 원인과 해결책을 위해 [추천 전문 검사]를 받아보시는 것을 권장합니다."
 */
export function buildGatewayMessage(
  result: IntegratedScoringResult,
  testNameById: Record<string, string> = {},
): string {
  const top = result.topDomain;
  if (!top || !top.isHigh) {
    return "현재 모든 영역이 안정 범위입니다. 평소 루틴을 유지하며 정기적으로 점검해보세요.";
  }
  const matched = result.recommendations.find((r) => r.domain === top.key);
  const testNames =
    matched?.recommendedTestIds.map((id) => testNameById[id] ?? id).join(", ") ?? "";
  return `당신은 현재 ${top.name} 영역의 심리적 에너지가 많이 소모된 상태입니다. 더 구체적인 원인과 해결책을 위해 ${testNames} 검사를 받아보시는 것을 권장합니다.`;
}

/**
 * 두 개 이상 영역이 고득점일 때 보여줄 복합 위험군 안내.
 */
export function buildComplexRiskNote(
  result: IntegratedScoringResult,
): string | null {
  const high = result.recommendations;
  if (high.length < 2) return null;
  const names = high.slice(0, 3).map((r) => r.domainName);
  return `${names.join(" / ")} 영역이 동시에 높게 나타났습니다. 영역 간 상호작용(예: 학습강박 → 만성피로)이 의심되니 1:1 코칭을 통해 종합적으로 살펴보시길 권장합니다.`;
}

/**
 * 한 번에 두 개 이상의 후속검사를 응시하지 않도록 안내.
 * 김종환 코치 원본 사양: "적어도 일주일의 간격 후 심리검사를 진행".
 */
export const FOLLOW_UP_INTERVAL_NOTICE =
  "한 번의 통합검사 이후 두 개 이상의 후속 심리검사를 받을 경우, 적어도 일주일의 간격을 두고 진행하시는 것을 권장합니다.";

export {
  DOMAIN_MAX_SCORE,
  DOMAIN_QUESTION_COUNT,
  DOMAIN_RECOMMEND_THRESHOLD,
  INTEGRATED_DOMAINS,
  INTEGRATED_TEST_QUESTIONS,
};
