import { describe, it, expect } from 'vitest';
import { getCharacterAssetUrl, getCharacterCardUrl, FALLBACK_ASSET } from '@/lib/character/asset-url';

describe('character asset URL', () => {
  it('builds breed/emotion_trend.webp path', () => {
    const url = getCharacterAssetUrl('poodle', 'anxious', 'declining');
    expect(url).toContain('/character-assets/poodle/anxious_declining.webp');
  });

  it('builds card asset URL', () => {
    const url = getCharacterCardUrl('shiba');
    expect(url).toContain('/character-assets/shiba/card.webp');
  });

  it('exposes a fallback path', () => {
    expect(FALLBACK_ASSET).toContain('neutral_stable.webp');
  });
});
