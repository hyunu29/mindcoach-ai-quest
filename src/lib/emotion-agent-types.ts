/* ─── Emotion Agent Types ─────────────────────────── */

export type PrimaryEmotion = 'happy' | 'calm' | 'neutral' | 'sad' | 'angry' | 'anxious';

export interface EmotionOption {
  key: PrimaryEmotion;
  emoji: string;
  label: string;
  score: number;
  color: string; // tailwind bg class
  gradientFrom: string;
  gradientTo: string;
}

export interface SecondaryEmotionOption {
  key: string;
  label: string;
}

export interface BodyReactionOption {
  key: string;
  label: string;
}

export interface AgentMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;
  chips?: ChipOption[];
  skipButton?: string;
  isJournalCard?: boolean;
  journalData?: EmotionJournalData;
}

export interface ChipOption {
  key: string;
  label: string;
  emoji?: string;
}

export interface EmotionJournalData {
  date: string;
  time: string;
  primaryEmotion: PrimaryEmotion;
  primaryEmotionLabel: string;
  secondaryEmotions: string[];
  situation: string;
  bodyReactions: string[];
  aiComment: string;
  emotionScore: number;
}

export type ConversationStep = 'idle' | 'emotion' | 'situation' | 'depth' | 'body' | 'summary' | 'saved';

export const emotionOptions: EmotionOption[] = [
  { key: 'happy', emoji: '😊', label: '좋아요', score: 5, color: 'bg-green-100', gradientFrom: '#D1FAE5', gradientTo: '#DBEAFE' },
  { key: 'calm', emoji: '😌', label: '편안해요', score: 4, color: 'bg-blue-100', gradientFrom: '#DBEAFE', gradientTo: '#D1FAE5' },
  { key: 'neutral', emoji: '😐', label: '그저 그래요', score: 3, color: 'bg-gray-100', gradientFrom: '#F3F4F6', gradientTo: '#EDE9FE' },
  { key: 'sad', emoji: '😢', label: '우울해요', score: 2, color: 'bg-purple-100', gradientFrom: '#EDE9FE', gradientTo: '#FCE7F3' },
  { key: 'angry', emoji: '😤', label: '짜증나요', score: 2, color: 'bg-pink-100', gradientFrom: '#FCE7F3', gradientTo: '#EDE9FE' },
  { key: 'anxious', emoji: '😰', label: '불안해요', score: 1, color: 'bg-violet-100', gradientFrom: '#EDE9FE', gradientTo: '#FCE7F3' },
];

export const secondaryEmotionMap: Record<PrimaryEmotion, SecondaryEmotionOption[]> = {
  happy: [
    { key: 'proud', label: '뿌듯함' },
    { key: 'excited', label: '설렘' },
    { key: 'relieved', label: '안도감' },
    { key: 'grateful', label: '감사' },
    { key: 'confident', label: '자신감' },
  ],
  calm: [
    { key: 'peaceful', label: '평온' },
    { key: 'satisfied', label: '만족' },
    { key: 'relaxed', label: '여유' },
    { key: 'stable', label: '안정' },
    { key: 'hopeful', label: '희망' },
  ],
  neutral: [
    { key: 'indifferent', label: '무관심' },
    { key: 'bored', label: '지루함' },
    { key: 'blank', label: '멍함' },
    { key: 'distracted', label: '잡생각' },
    { key: 'observing', label: '관망' },
  ],
  sad: [
    { key: 'lonely', label: '외로움' },
    { key: 'helpless', label: '무력감' },
    { key: 'grief', label: '슬픔' },
    { key: 'empty', label: '공허함' },
    { key: 'guilty', label: '죄책감' },
  ],
  angry: [
    { key: 'rage', label: '분노' },
    { key: 'frustrated', label: '답답함' },
    { key: 'unfair', label: '억울함' },
    { key: 'defeated', label: '좌절' },
    { key: 'exhausted', label: '지침' },
  ],
  anxious: [
    { key: 'restless', label: '초조함' },
    { key: 'worried', label: '걱정' },
    { key: 'fearful', label: '두려움' },
    { key: 'tense', label: '긴장' },
    { key: 'pressured', label: '압박감' },
  ],
};

export const bodyReactionOptions: BodyReactionOption[] = [
  { key: 'headache', label: '두통' },
  { key: 'chest_tight', label: '가슴 답답' },
  { key: 'shoulder_stiff', label: '어깨 뻣뻣' },
  { key: 'nausea', label: '속이 울렁' },
  { key: 'hand_shaking', label: '손 떨림' },
  { key: 'none', label: '없었어요' },
];

export const emotionEmojiMap: Record<PrimaryEmotion, string> = {
  happy: '😊',
  calm: '😌',
  neutral: '😐',
  sad: '😢',
  angry: '😤',
  anxious: '😰',
};
