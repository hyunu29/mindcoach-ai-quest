/* ─── 치토 (마이치 공식 캐릭터, 감자) ───────────────────────
 * 2026-08 브랜딩 결정: 기존 견종/묘종 4종 마스코트를 치토 단일 캐릭터로 통일.
 * 에셋: public/chito/{emotion}.webp + main.webp (캐릭터 시트에서 추출)
 * 시트 감정 매핑: 안정→happy · 안도→calm · 멍함→neutral · 울컥/속상→sad · 다짐→angry · 불안→anxious
 */
import type { PrimaryEmotion } from '@/lib/emotion-agent-types';

export const CHITO = {
  name: '치토',
  copy: '감정을 있는 그대로 느끼고, 이해하며 성장하는 작은 감자',
} as const;

export const CHITO_MAIN_URL = '/chito/main.webp';

// 2026-08-13 확정 브랜드 자산: 엠블럼(투명 PNG, 작은 아바타·아이콘용) / 워드마크(로고타입)
export const CHITO_EMBLEM_URL = '/brand/emblem.png';
export const MYCH_WORDMARK_URL = '/brand/wordmark.png';

/* 2026-09-07 투명 배경 포즈 세트 (원본 시트에서 ChatGPT 재생성, 512px)
 * 라이트 UI에서 다크 카드 프레이밍 없이 직접 배치할 때 사용 */
export const CHITO_POSES = {
  main: '/chito/transparent/main.png',
  waving: '/chito/transparent/waving.png',
  thinking: '/chito/transparent/thinking.png',
  cheering: '/chito/transparent/cheering.png',
  sleeping: '/chito/transparent/sleeping.png',
} as const;
export type ChitoPose = keyof typeof CHITO_POSES;

export function getChitoEmotionUrl(emotion: PrimaryEmotion): string {
  return `/chito/${emotion}.webp`;
}

/** 감정별 투명 배경 버전 (라이트 UI용, 2026-09-07)
 * ⚠️ angry는 원본 시트에 화남 표정이 없어 sad 복제 상태 — 신규 일러 도착 시 교체 */
export function getChitoTransparentEmotionUrl(emotion: PrimaryEmotion): string {
  return `/chito/transparent/${emotion}.png`;
}
