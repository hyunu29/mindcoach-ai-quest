import type { PrimaryEmotion } from '@/lib/emotion-agent-types';

export const BREEDS = ['shiba', 'poodle', 'korat', 'russian_blue'] as const;
export type Breed = typeof BREEDS[number];

export const EMOTION_KEYS: PrimaryEmotion[] = ['happy', 'calm', 'neutral', 'sad', 'angry', 'anxious'];

export const TREND_KEYS = ['rising', 'stable', 'declining', 'crashing'] as const;
export type CharacterTrend = typeof TREND_KEYS[number];

export interface BreedPersona {
  breed: Breed;
  koreanName: string;
  personaName: string;
  copy: string;
}

export const BREED_PERSONAS: Record<Breed, BreedPersona> = {
  shiba: {
    breed: 'shiba',
    koreanName: '시바이누',
    personaName: '의욕폭주형',
    copy: '끝까지 달려가는 너 — 가끔은 숨도 골라야 해',
  },
  poodle: {
    breed: 'poodle',
    koreanName: '푸들',
    personaName: '완벽주의형',
    copy: '완벽한 너를 추구하는 너 — 어제보다 한 발이면 충분해',
  },
  korat: {
    breed: 'korat',
    koreanName: '코리안숏헤어',
    personaName: '마이페이스형',
    copy: '내 길은 내가 가는 너 — 곁에서 조용히 응원할게',
  },
  russian_blue: {
    breed: 'russian_blue',
    koreanName: '러시안블루',
    personaName: '번아웃취약형',
    copy: '깊게 느끼는 너 — 잠시 멈춰도 괜찮아',
  },
};
