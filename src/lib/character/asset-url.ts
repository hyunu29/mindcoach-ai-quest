import type { Breed, CharacterTrend } from './types';
import type { PrimaryEmotion } from '@/lib/emotion-agent-types';

const STORAGE_BASE = 'https://bnhnaaarsyauppdbrbco.supabase.co/storage/v1/object/public/character-assets';

export function getCharacterAssetUrl(
  breed: Breed,
  emotion: PrimaryEmotion,
  trend: CharacterTrend,
): string {
  return `${STORAGE_BASE}/${breed}/${emotion}_${trend}.webp`;
}

export function getCharacterCardUrl(breed: Breed): string {
  return `${STORAGE_BASE}/${breed}/card.webp`;
}

export const FALLBACK_ASSET = `${STORAGE_BASE}/poodle/neutral_stable.webp`;
