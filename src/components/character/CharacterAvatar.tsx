import { useState } from 'react';
import type { PrimaryEmotion } from '@/lib/emotion-agent-types';
import { CHITO, CHITO_MAIN_URL, getChitoEmotionUrl } from '@/lib/character/chito';

type Size = 'hero' | 'card' | 'mini';

const SIZE_CLASS: Record<Size, string> = {
  hero: 'w-[260px] h-[260px]',
  card: 'w-[160px] h-[160px]',
  mini: 'w-[48px] h-[48px]',
};

interface Props {
  /** 없으면 메인(기본 미소) 이미지 */
  emotion?: PrimaryEmotion;
  size: Size;
  className?: string;
}

export function CharacterAvatar({ emotion, size, className }: Props) {
  const [errored, setErrored] = useState(false);
  const src = errored || !emotion ? CHITO_MAIN_URL : getChitoEmotionUrl(emotion);
  return (
    <img
      src={src}
      alt={`${CHITO.name}${emotion ? ` - ${emotion}` : ''}`}
      onError={() => setErrored(true)}
      className={`object-contain ${SIZE_CLASS[size]} ${className ?? ''}`}
      loading="lazy"
    />
  );
}
