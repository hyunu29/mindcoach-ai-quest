import { describe, it, expect } from 'vitest';
import { BREEDS, EMOTION_KEYS, TREND_KEYS, BREED_PERSONAS, type CharacterTrend } from '@/lib/character/types';

describe('character types', () => {
  it('exposes 4 breeds for Phase 1 launch', () => {
    expect(BREEDS).toEqual(['shiba', 'poodle', 'korat', 'russian_blue']);
  });

  it('exposes 6 emotion keys matching PrimaryEmotion', () => {
    expect(EMOTION_KEYS).toEqual(['happy', 'calm', 'neutral', 'sad', 'angry', 'anxious']);
  });

  it('exposes 4 trend keys', () => {
    const trends: CharacterTrend[] = ['rising', 'stable', 'declining', 'crashing'];
    expect(TREND_KEYS).toEqual(trends);
  });

  it('defines persona metadata for every breed', () => {
    for (const breed of BREEDS) {
      const persona = BREED_PERSONAS[breed];
      expect(persona.breed).toBe(breed);
      expect(persona.koreanName.length).toBeGreaterThan(0);
      expect(persona.personaName.length).toBeGreaterThan(0);
      expect(persona.copy.length).toBeGreaterThan(0);
    }
  });
});
