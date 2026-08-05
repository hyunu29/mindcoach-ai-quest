import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CharacterAvatar } from '@/components/character/CharacterAvatar';

describe('CharacterAvatar (치토)', () => {
  it('renders emotion-specific chito asset', () => {
    const { getByRole } = render(<CharacterAvatar emotion="anxious" size="card" />);
    const img = getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('/chito/anxious.webp');
  });

  it('renders main asset when no emotion is given', () => {
    const { getByRole } = render(<CharacterAvatar size="hero" />);
    const img = getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('/chito/main.webp');
  });

  it('falls back to main asset on image error', () => {
    const { getByRole } = render(<CharacterAvatar emotion="happy" size="card" />);
    const img = getByRole('img') as HTMLImageElement;
    fireEvent.error(img);
    expect(img.src).toContain('/chito/main.webp');
  });

  it('uses 치토 in alt text', () => {
    const { getByRole } = render(<CharacterAvatar emotion="calm" size="hero" />);
    const img = getByRole('img') as HTMLImageElement;
    expect(img.alt).toContain('치토');
  });
});
