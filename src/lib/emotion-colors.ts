import { emotionEmojiMap, type PrimaryEmotion } from '@/lib/emotion-agent-types';

/* ─── 감정 고정 색 팔레트 (전 화면 공통) ─────────────────────
 * 2026-09-03 점검 리포트 반영: 같은 감정이 화면마다 다른 색으로 표시되던 문제 해결.
 * 낙인 방지를 위해 빨강/초록(좋고 나쁨 코드) 대신 hue로만 구분한다.
 * 감정에 "나쁜 색"은 없다 — 불안=보라, 우울=파랑은 경고가 아니라 구분이다. */
export const EMOTION_COLORS: Record<PrimaryEmotion, string> = {
  happy: '#FBBF24',   // 따뜻한 노랑
  calm: '#34D399',    // 민트
  neutral: '#9CA3AF', // 회색
  sad: '#60A5FA',     // 파랑
  angry: '#FB923C',   // 주황
  anxious: '#A78BFA', // 보라
};

/** 이모지 키 조회용 (레거시 화면 호환) */
export const EMOTION_COLORS_BY_EMOJI: Record<string, string> = Object.fromEntries(
  (Object.keys(EMOTION_COLORS) as PrimaryEmotion[]).map((k) => [
    emotionEmojiMap[k],
    EMOTION_COLORS[k],
  ]),
);

export function getEmotionColor(emotion: string): string {
  return EMOTION_COLORS[emotion as PrimaryEmotion] ?? EMOTION_COLORS.neutral;
}
