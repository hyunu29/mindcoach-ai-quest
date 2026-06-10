import { useState } from 'react';
import type { Breed, CharacterTrend } from '@/lib/character/types';
import type { PrimaryEmotion } from '@/lib/emotion-agent-types';
import { getCharacterAssetUrl, FALLBACK_ASSET } from '@/lib/character/asset-url';
import { BREED_PERSONAS } from '@/lib/character/types';

type Size = 'hero' | 'card' | 'mini';

const SIZE_CLASS: Record<Size, string> = {
  hero: 'w-[300px] h-[300px]',
  card: 'w-[160px] h-[160px]',
  mini: 'w-[48px] h-[48px]',
};

interface Props {
  breed: Breed;
  emotion: PrimaryEmotion;
  trend: CharacterTrend;
  size: Size;
  className?: string;
}

export function CharacterAvatar({ breed, emotion, trend, size, className }: Props) {
  const [errored, setErrored] = useState(false);
  const src = errored ? FALLBACK_ASSET : getCharacterAssetUrl(breed, emotion, trend);
  return (
    <img
      src={src}
      alt={`${BREED_PERSONAS[breed].koreanName} - ${emotion}`}
      onError={() => setErrored(true)}
      className={`object-contain ${SIZE_CLASS[size]} ${className ?? ''}`}
      loading="lazy"
    />
  );
}
