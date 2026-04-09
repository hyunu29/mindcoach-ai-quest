/**
 * Emotion Detector — detects emotions from text and maps to emotions table schema (emoji/score/memo)
 */

const EMOTION_MAP: Record<string, { emoji: string; score: number; keywords: string[] }> = {
  happy: {
    emoji: "좋아요",
    score: 5,
    keywords: ['좋다', '좋아', '행복', '뿌듯', '기쁘다', '기뻐', '신나', '즐거', '해방감', '후련', '성취', '좋았', '기분 좋', '편하다', '편안', '안심', '평온', '여유', '안정', '만족', '감사', '편해'],
  },
  neutral: {
    emoji: "보통이에요",
    score: 4,
    keywords: ['그저 그래', '보통', '별로', '무관심', '그냥', '멍', '모르겠'],
  },
  sad: {
    emoji: "우울해요",
    score: 2,
    keywords: ['우울', '슬프', '외롭', '서글', '눈물', '울적', '공허', '허무', '슬퍼', '우울해', '외로워', '무기력', '지치', '힘들', '피곤', '몸살', '녹초', '피로', '지쳤', '피곤해'],
  },
  angry: {
    emoji: "짜증나요",
    score: 2,
    keywords: ['짜증', '화나', '열받', '답답', '억울', '분노', '좌절', '빡', '짜증나', '화가', '답답해'],
  },
  anxious: {
    emoji: "불안해요",
    score: 1,
    keywords: ['불안', '걱정', '초조', '긴장', '두렵', '무섭', '압박', '조마조마', '불안해', '걱정돼'],
  },
};

// Priority: more negative = higher priority for "strongest" emotion
const PRIORITY: Record<string, number> = {
  anxious: 1,
  sad: 2,
  angry: 3,
  neutral: 4,
  happy: 5,
};

export interface DetectedEmotionResult {
  emoji: string;
  score: number;
  category: string;
  matchedKeywords: string[];
}

/**
 * Detect emotion from text → returns emoji/score mapped to emotions table
 */
export function detectEmotionForEmotions(text: string): DetectedEmotionResult | null {
  const lower = text.toLowerCase();
  const results: { category: string; count: number; keywords: string[] }[] = [];

  for (const [cat, { keywords }] of Object.entries(EMOTION_MAP)) {
    const matched = keywords.filter(kw => lower.includes(kw));
    if (matched.length > 0) {
      results.push({ category: cat, count: matched.length, keywords: matched });
    }
  }

  if (results.length === 0) return null;

  // Pick strongest (lowest priority = most negative, or highest match count)
  results.sort((a, b) => {
    if (PRIORITY[a.category] !== PRIORITY[b.category]) {
      return PRIORITY[a.category] - PRIORITY[b.category];
    }
    return b.count - a.count;
  });

  const best = results[0];
  const map = EMOTION_MAP[best.category];
  return {
    emoji: map.emoji,
    score: map.score,
    category: best.category,
    matchedKeywords: best.keywords,
  };
}

/**
 * Generate a short memo (≤30 chars) from user messages
 */
export function generateMemo(userMessages: string[]): string {
  const lastMsg = userMessages[userMessages.length - 1] || "";
  const trimmed = lastMsg.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= 27) return `[AI 코치] ${trimmed}`;
  return `[AI 코치] ${trimmed.slice(0, 27)}...`;
}

const DIRECT_REQUEST_KEYWORDS = [
  '감정 기록', '기분 기록', '오늘 기분', '감정 저장', '기분 저장',
  '감정기록', '기분기록', '기록해줘', '저장해줘', '기록해 줘', '저장해 줘',
  '남겨줘', '남겨 줘',
];

const DENY_KEYWORDS = ['기록하지 마', '안 해도 돼', '기록 안', '저장 안', '하지마', '안해도'];

export function isDirectRecordRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return DIRECT_REQUEST_KEYWORDS.some(k => lower.includes(k));
}

export function isDenyRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return DENY_KEYWORDS.some(k => lower.includes(k));
}
