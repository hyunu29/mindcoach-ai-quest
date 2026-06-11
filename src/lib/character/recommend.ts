import type { Breed } from './types';

export type DomainKey =
  | 'emotional_instability'
  | 'test_stage_anxiety'
  | 'learning_obsession'
  | 'routine_time_control'
  | 'cognitive_focus'
  | 'learning_avoidance'
  | 'somatic_pain'
  | 'energy_burnout'
  | 'self_relationships'
  | 'sleep_routine';

export type DomainScores = Record<DomainKey, number>;

const WEIGHTS: Record<Breed, Partial<Record<DomainKey, number>>> = {
  shiba: {
    learning_obsession: 0.4,
    emotional_instability: 0.3,
    energy_burnout: 0.3,
  },
  poodle: {
    learning_obsession: 0.4,
    test_stage_anxiety: 0.4,
    self_relationships: 0.2,
  },
  korat: {
    learning_avoidance: 0.4,
    routine_time_control: 0.3,
    cognitive_focus: 0.3,
  },
  russian_blue: {
    energy_burnout: 0.35,
    somatic_pain: 0.25,
    sleep_routine: 0.2,
    cognitive_focus: 0.2,
  },
};

export interface BreedAffinity {
  breed: Breed;
  score: number;
}

export type Recommendation =
  | { status: 'insufficient_data'; scores: BreedAffinity[] }
  | { status: 'single'; top: BreedAffinity; rest: BreedAffinity[] }
  | {
      status: 'tie';
      top: BreedAffinity;
      runnerUp: BreedAffinity;
      rest: BreedAffinity[];
    };

const INSUFFICIENT_THRESHOLD = 8;
const TIE_GAP = 2;

export function recommendCharacter(domains: DomainScores): Recommendation {
  const scores: BreedAffinity[] = (Object.keys(WEIGHTS) as Breed[])
    .map((breed) => {
      const w = WEIGHTS[breed];
      const score = (Object.entries(w) as [DomainKey, number][]).reduce(
        (sum, [k, weight]) => sum + (domains[k] ?? 0) * weight,
        0,
      );
      return { breed, score };
    })
    .sort((a, b) => b.score - a.score);

  if (scores[0].score < INSUFFICIENT_THRESHOLD) {
    return { status: 'insufficient_data', scores };
  }
  const gap = scores[0].score - scores[1].score;
  if (gap < TIE_GAP) {
    return {
      status: 'tie',
      top: scores[0],
      runnerUp: scores[1],
      rest: scores.slice(2),
    };
  }
  return { status: 'single', top: scores[0], rest: scores.slice(1) };
}
