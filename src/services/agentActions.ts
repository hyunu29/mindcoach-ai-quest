/**
 * Agent Actions — actual DB operations the AI coach can perform
 */
import { supabase } from "@/integrations/supabase/client";

export interface SaveEmotionParams {
  userId: string;
  emoji: string;
  score: number;
  memo: string;
}

/**
 * Action 1: Save emotion record to emotions table
 */
export async function saveEmotionRecord(params: SaveEmotionParams) {
  const { data, error } = await supabase
    .from("emotions")
    .insert({
      user_id: params.userId,
      emoji: params.emoji,
      score: params.score,
      memo: params.memo,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Action 2: Get recent 7 days emotions
 */
export async function getRecentEmotions(userId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("emotions")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false });

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
  return emotions.map(e =>
    `- ${new Date(e.created_at).toLocaleDateString("ko-KR")}: ${e.emoji}${e.memo ? " (" + e.memo + ")" : ""}`
  ).join("\n");
}
