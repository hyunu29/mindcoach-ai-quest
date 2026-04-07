/* ─── Emotion Detection from Text ─────────────────── */
import type { PrimaryEmotion } from './emotion-agent-types';

export const EMOTION_KEYWORDS: Record<PrimaryEmotion, string[]> = {
  happy: ['좋다', '좋아', '행복', '뿌듯', '기쁘다', '기뻐', '신나', '즐거', '해방감', '후련', '성취', '좋았', '기분 좋'],
  calm: ['편하다', '편안', '안심', '평온', '여유', '안정', '만족', '감사', '편해'],
  neutral: ['그저 그래', '보통', '별로', '무관심', '그냥', '멍', '모르겠'],
  sad: ['우울', '슬프', '외롭', '서글', '눈물', '울적', '공허', '허무', '슬퍼', '우울해', '외로워'],
  angry: ['짜증', '화나', '열받', '답답', '억울', '분노', '좌절', '빡', '짜증나', '화가', '답답해'],
  anxious: ['불안', '걱정', '초조', '긴장', '두렵', '무섭', '압박', '조마조마', '불안해', '걱정돼'],
};

export const BODY_KEYWORDS: Record<string, string[]> = {
  headache: ['두통', '머리 아파', '머리가 깨질', '머리 아프'],
  chest_tight: ['가슴 답답', '숨이 막혀', '가슴이 조여', '가슴이 답답'],
  fatigue: ['피곤', '지치', '몸살', '기력', '녹초', '피로', '지쳤', '피곤해'],
  insomnia: ['못 잤', '잠이 안', '불면', '뒤척'],
  stomach: ['속이 울렁', '소화가 안', '배가 아파', '속이 안 좋'],
  shoulder_stiff: ['어깨 뻣뻣', '어깨가 아파', '목이 아파', '뻣뻣'],
};

const DIRECT_REQUEST_KEYWORDS = [
  '감정 기록', '기분 기록', '오늘 기분', '감정 저장', '기분 저장',
  '감정기록', '기분기록', '기록해줘', '저장해줘',
];

export interface DetectedEmotion {
  primaryEmotion: PrimaryEmotion;
  emotionScore: number;
  bodyReactions: string[];
  matchedKeywords: string[];
  isDirectRequest: boolean;
}

const EMOTION_SCORES: Record<PrimaryEmotion, number> = {
  happy: 5, calm: 4, neutral: 3, sad: 2, angry: 2, anxious: 1,
};

export function detectEmotionFromText(text: string): DetectedEmotion | null {
  const lower = text.toLowerCase();

  // Check direct request
  const isDirectRequest = DIRECT_REQUEST_KEYWORDS.some(k => lower.includes(k));

  // Count emotion keyword matches
  const counts: Record<PrimaryEmotion, string[]> = {
    happy: [], calm: [], neutral: [], sad: [], angry: [], anxious: [],
  };

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        counts[emotion as PrimaryEmotion].push(kw);
      }
    }
  }

  // Find best match
  let bestEmotion: PrimaryEmotion | null = null;
  let bestCount = 0;
  const allMatched: string[] = [];

  for (const [emotion, matched] of Object.entries(counts)) {
    allMatched.push(...matched);
    if (matched.length > bestCount) {
      bestCount = matched.length;
      bestEmotion = emotion as PrimaryEmotion;
    }
  }

  if (!bestEmotion && !isDirectRequest) return null;
  if (!bestEmotion) bestEmotion = 'neutral';

  // Detect body reactions
  const bodyReactions: string[] = [];
  for (const [key, keywords] of Object.entries(BODY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      bodyReactions.push(key);
    }
  }

  return {
    primaryEmotion: bestEmotion,
    emotionScore: EMOTION_SCORES[bestEmotion],
    bodyReactions,
    matchedKeywords: allMatched,
    isDirectRequest,
  };
}

export function getSecondaryEmotionsFromKeywords(
  text: string,
  primaryEmotion: PrimaryEmotion
): string[] {
  const secondaryMap: Record<PrimaryEmotion, Record<string, string[]>> = {
    happy: { '뿌듯함': ['뿌듯', '성취'], '안도감': ['안도', '안심', '후련'], '설렘': ['신나', '설레'], '감사': ['감사'], '자신감': ['자신감'] },
    calm: { '평온': ['평온', '차분'], '만족': ['만족'], '여유': ['여유'], '안정': ['안정'], '희망': ['희망'] },
    neutral: { '무관심': ['무관심'], '지루함': ['지루'], '멍함': ['멍'], '잡생각': ['잡생각'] },
    sad: { '외로움': ['외롭', '외로워'], '무력감': ['무기력', '무력'], '슬픔': ['슬프', '슬퍼'], '공허함': ['공허', '허무'], '죄책감': ['죄책'] },
    angry: { '분노': ['분노', '화나'], '답답함': ['답답'], '억울함': ['억울'], '좌절': ['좌절'], '지침': ['지치', '피곤'] },
    anxious: { '초조함': ['초조'], '걱정': ['걱정'], '두려움': ['두렵', '무섭'], '긴장': ['긴장'], '압박감': ['압박'] },
  };

  const lower = text.toLowerCase();
  const result: string[] = [];
  const map = secondaryMap[primaryEmotion];

  for (const [label, keywords] of Object.entries(map)) {
    if (keywords.some(kw => lower.includes(kw))) {
      result.push(label);
    }
  }

  return result;
}
