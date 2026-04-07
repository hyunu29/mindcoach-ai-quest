export interface TipData {
  title: string;
  description: string;
}

export interface EmotionCardPayload {
  primaryEmotion: string;
  secondaryEmotions: string[];
  emotionScore: number;
  situation: string;
  bodyReactions: string[];
  aiComment: string;
}

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
  tip?: TipData;
  timestamp?: string;
  emotionCard?: EmotionCardPayload;
}

export interface DbSession {
  id: string;
  related_syndrome: string | null;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}
