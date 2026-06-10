import { describe, it, expect } from 'vitest';
import { recommendCharacter } from '@/lib/character/recommend';

const baseDomains = (overrides: Record<string, number> = {}) => ({
  emotional_instability: 0,
  test_stage_anxiety: 0,
  learning_obsession: 0,
  routine_time_control: 0,
  cognitive_focus: 0,
  learning_avoidance: 0,
  somatic_pain: 0,
  energy_burnout: 0,
  self_relationships: 0,
  sleep_routine: 0,
  ...overrides,
});

describe('recommendCharacter', () => {
  it('returns insufficient_data when all top scores < 8', () => {
    const result = recommendCharacter(baseDomains());
    expect(result.status).toBe('insufficient_data');
  });

  it('recommends poodle for high obsession + test anxiety', () => {
    const result = recommendCharacter(
      baseDomains({
        learning_obsession: 22,
        test_stage_anxiety: 22,
        self_relationships: 18,
      }),
    );
    expect(result.status).toBe('single');
    if (result.status === 'single') expect(result.top.breed).toBe('poodle');
  });

  it('recommends russian_blue for burnout + somatic + sleep', () => {
    const result = recommendCharacter(
      baseDomains({
        energy_burnout: 23,
        somatic_pain: 20,
        sleep_routine: 18,
        cognitive_focus: 15,
      }),
    );
    expect(result.status).toBe('single');
    if (result.status === 'single') expect(result.top.breed).toBe('russian_blue');
  });

  it('recommends korat for high avoidance + low routine control', () => {
    const result = recommendCharacter(
      baseDomains({
        learning_avoidance: 22,
        routine_time_control: 22,
        cognitive_focus: 18,
      }),
    );
    expect(result.status).toBe('single');
    if (result.status === 'single') expect(result.top.breed).toBe('korat');
  });

  it('sorts breeds by affinity score descending', () => {
    const result = recommendCharacter(
      baseDomains({ energy_burnout: 23, somatic_pain: 20, sleep_routine: 18 }),
    );
    if (result.status === 'single') {
      const ordered = [result.top, ...result.rest];
      for (let i = 1; i < ordered.length; i += 1) {
        expect(ordered[i - 1].score).toBeGreaterThanOrEqual(ordered[i].score);
      }
    }
  });
});
