import type { CharacterTrend } from './types';

/** scores: 오래된 → 최신 순. 6개 이상이면 최근 3 vs 이전 3 비교. */
export function calculateEmotionTrend(scores: number[]): CharacterTrend {
  if (scores.length < 6) return 'stable';
  const recent = scores.slice(-3);
  const prev = scores.slice(-6, -3);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const diff = avg(recent) - avg(prev);
  if (diff <= -1.5) return 'crashing';
  if (diff <= -0.7) return 'declining';
  if (diff >= 0.7) return 'rising';
  return 'stable';
}

export const TREND_COPY: Record<CharacterTrend, string> = {
  rising: '회복 중 🌱',
  stable: '안정 ☀️',
  declining: '좀 지치고 있어 🌫️',
  crashing: '많이 힘들어 보여 🌧️',
};
