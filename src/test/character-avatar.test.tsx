import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CharacterAvatar } from '@/components/character/CharacterAvatar';

describe('CharacterAvatar', () => {
  it('renders img with correct src for breed/emotion/trend', () => {
    const { getByRole } = render(
      <CharacterAvatar breed="poodle" emotion="anxious" trend="declining" size="card" />,
    );
    const img = getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('poodle/anxious_declining.webp');
  });

  it('falls back to fallback asset on image error', () => {
    const { getByRole } = render(
      <CharacterAvatar breed="poodle" emotion="happy" trend="rising" size="card" />,
    );
    const img = getByRole('img') as HTMLImageElement;
    fireEvent.error(img);
    expect(img.src).toContain('neutral_stable.webp');
  });

  it('uses breed Korean name in alt text', () => {
    const { getByRole } = render(
      <CharacterAvatar breed="shiba" emotion="calm" trend="stable" size="hero" />,
    );
    const img = getByRole('img') as HTMLImageElement;
    expect(img.alt).toContain('시바이누');
  });
});
