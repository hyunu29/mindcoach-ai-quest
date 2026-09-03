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

/* 원본 webp는 검은 배경이 박혀 있어 라이트 UI에서는 "밤을 담은 창문" 프레이밍이 필수
 * (다크 라운드 카드 + 보라 글로우 — CHITO-STORY-SCENARIO.md §4) */
const FRAME_CLASS: Record<Size, string> = {
  hero: 'rounded-3xl ring-1 ring-primary/20 shadow-[0_16px_48px_-16px_rgba(100,102,241,0.5)]',
  card: 'rounded-3xl ring-1 ring-primary/20 shadow-[0_12px_36px_-12px_rgba(100,102,241,0.45)]',
  mini: 'rounded-xl ring-1 ring-primary/15',
};

export function CharacterAvatar({ emotion, size, className }: Props) {
  const [errored, setErrored] = useState(false);
  const src = errored || !emotion ? CHITO_MAIN_URL : getChitoEmotionUrl(emotion);
  return (
    <img
      src={src}
      alt={`${CHITO.name}${emotion ? ` - ${emotion}` : ''}`}
      onError={() => setErrored(true)}
      className={`object-cover ${FRAME_CLASS[size]} ${SIZE_CLASS[size]} ${
        size === 'hero' ? 'animate-chito-float' : ''
      } ${className ?? ''}`}
      loading="lazy"
    />
  );
}
