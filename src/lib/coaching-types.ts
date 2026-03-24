export interface TipData {
  title: string;
  description: string;
}

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
  tip?: TipData;
  timestamp?: string;
}

export interface DbSession {
  id: string;
  related_syndrome: string | null;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}
