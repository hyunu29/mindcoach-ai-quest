/**
 * Agent Actions — actual DB operations the AI coach can perform
 * 감정 저장/조회는 emotion_records로 일원화 (레거시 emotions 테이블 미사용, 2026-08-05)
 */
import { supabase } from "@/integrations/supabase/client";
import { emotionEmojiMap, emotionOptions, type PrimaryEmotion } from "@/lib/emotion-agent-types";

export interface SaveEmotionParams {
  userId: string;
  category: string; // PrimaryEmotion key ('happy' | 'neutral' | ...)
  score: number;
  memo: string;
}

/**
 * Action 1: Save emotion record (emotion_records)
 */
export async function saveEmotionRecord(params: SaveEmotionParams) {
  const { data, error } = await supabase
    .from("emotion_records")
    .insert({
      user_id: params.userId,
      primary_emotion: params.category,
      emotion_score: params.score,
      situation: params.memo,
      source: "coaching_chat",
      conversation_log: [],
      recorded_at: new Date().toISOString(),
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Action 2: Get recent 7 days emotion records
 */
export async function getRecentEmotions(userId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("emotion_records")
    .select("primary_emotion, emotion_score, situation, recorded_at")
    .eq("user_id", userId)
    .gte("recorded_at", sevenDaysAgo.toISOString())
    .order("recorded_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Action 3: Recommend test based on emotion category
 */
export async function recommendTest(emotionCategory: string) {
  const categoryMap: Record<string, string> = {
    anxious: "E",
    sad: "D",
    angry: "B",
  };

  const testCategory = categoryMap[emotionCategory];
  if (!testCategory) return null;

  const { data, error } = await supabase
    .from("tests")
    .select("id, name, related_syndrome, category")
    .eq("category", testCategory)
    .eq("is_coming_soon", false)
    .limit(3);

  if (error) return null;
  return data || [];
}

/**
 * Build emotion summary string from recent records for AI context
 */
export function buildEmotionSummary(emotions: any[]): string {
  if (!emotions || emotions.length === 0) return "";
  return emotions.map(e => {
    const key = e.primary_emotion as PrimaryEmotion;
    const emoji = emotionEmojiMap[key] ?? "";
    const label = emotionOptions.find(o => o.key === key)?.label ?? e.primary_emotion;
    return `- ${new Date(e.recorded_at).toLocaleDateString("ko-KR")}: ${emoji} ${label}${e.situation ? " (" + e.situation + ")" : ""}`;
  }).join("\n");
}
