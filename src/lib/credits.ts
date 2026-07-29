import { supabase } from "@/integrations/supabase/client";

export interface CreditState {
  creditId: string | null;
  remaining: number;
  granted: number;
}

export async function fetchCurrentCredits(userId: string): Promise<CreditState | null> {
  // 크레딧 팩으로 여러 유효 period가 공존할 수 있어 전체 합산
  const { data, error } = await supabase
    .from("user_credits")
    .select("id, credits_granted, credits_used, period_end")
    .eq("user_id", userId)
    .gt("period_end", new Date().toISOString());

  if (error) {
    console.error("fetchCurrentCredits error:", error);
    return { creditId: null, remaining: 0, granted: 0 };
  }
  if (!data || data.length === 0) return { creditId: null, remaining: 0, granted: 0 };

  let granted = 0;
  let used = 0;
  for (const row of data) {
    granted += Number(row.credits_granted ?? 0);
    used += Number(row.credits_used ?? 0);
  }
  return {
    creditId: data[0].id,
    granted,
    remaining: Math.max(0, granted - used),
  };
}

export function formatCredits(remaining: number): string {
  return remaining % 1 === 0 ? String(remaining) : remaining.toFixed(1);
}

export function estimateConversations(remaining: number): number {
  return Math.floor(remaining);
}
