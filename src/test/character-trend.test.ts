import { describe, it, expect } from 'vitest';
import { calculateEmotionTrend } from '@/lib/character/trend';

describe('calculateEmotionTrend', () => {
  it('returns stable for <6 records (insufficient)', () => {
    expect(calculateEmotionTrend([3, 4, 3])).toBe('stable');
  });

  it('returns rising when recent3 avg - prev3 avg >= 0.7', () => {
    expect(calculateEmotionTrend([1, 1, 2, 4, 4, 5])).toBe('rising');
  });

  it('returns declining when diff is between -0.7 and -1.5', () => {
    // prev [4,4,3] avg=3.67, recent [3,3,2] avg=2.67, diff=-1.0
    expect(calculateEmotionTrend([4, 4, 3, 3, 3, 2])).toBe('declining');
  });

  it('returns crashing when diff <= -1.5', () => {
    expect(calculateEmotionTrend([5, 5, 5, 2, 1, 1])).toBe('crashing');
  });

  it('returns stable when diff within +/-0.7', () => {
    expect(calculateEmotionTrend([3, 4, 3, 3, 4, 3])).toBe('stable');
  });
});
