import { supabase } from "@/integrations/supabase/client";

export interface CreditState {
  creditId: string | null;
  remaining: number;
  granted: number;
}

export async function fetchCurrentCredits(userId: string): Promise<CreditState | null> {
  const { data, error } = await supabase
    .from("user_credits")
    .select("id, credits_granted, credits_used, period_end")
    .eq("user_id", userId)
    .gt("period_end", new Date().toISOString())
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchCurrentCredits error:", error);
    return { creditId: null, remaining: 0, granted: 0 };
  }
  if (!data) return { creditId: null, remaining: 0, granted: 0 };

  const granted = Number(data.credits_granted ?? 0);
  const used = Number(data.credits_used ?? 0);
  return {
    creditId: data.id,
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
