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

  const granted = data.credits_granted ?? 0;
  const used = data.credits_used ?? 0;
  return {
    creditId: data.id,
    granted,
    remaining: Math.max(0, granted - used),
  };
}

export interface ConsumeResult {
  success: boolean;
  creditId: string | null;
  remaining: number;
}

export async function consumeAiCredit(cost = 1): Promise<ConsumeResult> {
  const { data, error } = await supabase.rpc("consume_ai_credit", { p_cost: cost });
  if (error) {
    console.error("consume_ai_credit error:", error);
    return { success: false, creditId: null, remaining: 0 };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    success: !!row?.success,
    creditId: row?.credit_id ?? null,
    remaining: row?.remaining ?? 0,
  };
}
