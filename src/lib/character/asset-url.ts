import type { Breed, CharacterTrend } from './types';
import type { PrimaryEmotion } from '@/lib/emotion-agent-types';

const REMOTE_BASE = 'https://bpkzljeplyqvbmwwomom.supabase.co/storage/v1/object/public/character-assets';
const LOCAL_BASE = '/character-assets-local';

const USE_LOCAL = import.meta.env.VITE_USE_LOCAL_CHARACTER_ASSETS === 'true';
const BASE = USE_LOCAL ? LOCAL_BASE : REMOTE_BASE;

export function getCharacterAssetUrl(
  breed: Breed,
  emotion: PrimaryEmotion,
  trend: CharacterTrend,
): string {
  return `${BASE}/${breed}/${emotion}_${trend}.webp`;
}

export function getCharacterCardUrl(breed: Breed): string {
  if (USE_LOCAL) {
    return `${BASE}/${breed}/calm_stable.webp`;
  }
  return `${BASE}/${breed}/card.webp`;
}

export const FALLBACK_ASSET = USE_LOCAL
  ? `${LOCAL_BASE}/shiba/neutral_stable.webp`
  : `${REMOTE_BASE}/poodle/neutral_stable.webp`;
