import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "UNAUTHORIZED" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "UNAUTHORIZED" });
    const userId = userData.user.id;

    const body = await req.json().catch(() => null) as
      | { orderId?: string; paymentKey?: string; amount?: number }
      | null;
    if (!body?.orderId || !body?.paymentKey || typeof body.amount !== "number") {
      return json(400, { error: "INVALID_BODY" });
    }
    const { orderId, paymentKey, amount } = body;

    const admin = createClient(supabaseUrl, serviceKey);

    // 3-1. payments 조회
    const { data: payment, error: fetchErr } = await admin
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .single();
    if (fetchErr || !payment) return json(404, { error: "ORDER_NOT_FOUND" });
    if (payment.user_id !== userId) return json(403, { error: "FORBIDDEN" });

    // 3-2. 멱등 처리
    if (payment.status === "completed") {
      return json(200, {
        status: "already_completed",
        orderId,
        productType: payment.product_type,
        productId: payment.product_id,
        amount: payment.amount,
      });
    }
    if (payment.status !== "pending") {
      return json(409, { error: "INVALID_STATUS", currentStatus: payment.status });
    }

    // 3-3. 금액 검증 (클라 vs DB)
    if (Number(amount) !== payment.amount) {
      await admin.from("payments").update({
        status: "failed",
        failed_at: new Date().toISOString(),
        metadata: {
          ...(payment.metadata ?? {}),
          fail_reason: "AMOUNT_MISMATCH",
          client_amount: amount,
          db_amount: payment.amount,
        },
      }).eq("order_id", orderId).eq("status", "pending");
      return json(400, { error: "AMOUNT_MISMATCH" });
    }

    // 3-4. PG 검증 (Mock: paymentKey 형식 체크)
    const pgVerified = typeof paymentKey === "string" && paymentKey.startsWith("mock_");
    if (!pgVerified) {
      await admin.from("payments").update({
        status: "failed",
        failed_at: new Date().toISOString(),
        metadata: {
          ...(payment.metadata ?? {}),
          fail_reason: "PG_VERIFY_FAILED",
          payment_key: paymentKey,
        },
      }).eq("order_id", orderId).eq("status", "pending");
      return json(400, { error: "PG_VERIFY_FAILED" });
    }
    const pgAmount = amount; // Mock: 클라 amount 그대로. 실제 PG는 PG 응답값.
    if (pgAmount !== payment.amount) {
      return json(400, { error: "PG_AMOUNT_MISMATCH" });
    }

    // 3-5. 멱등 UPDATE
    const { data: updated, error: updateErr } = await admin
      .from("payments")
      .update({
        status: "completed",
        paid_at: new Date().toISOString(),
        provider_payment_key: paymentKey,
        metadata: {
          ...(payment.metadata ?? {}),
          verify_response: {
            paymentKey,
            amount: pgAmount,
            verifiedAt: new Date().toISOString(),
          },
        },
      })
      .eq("order_id", orderId)
      .eq("status", "pending")
      .select("*")
      .single();

    if (updateErr || !updated) {
      const { data: retry } = await admin
        .from("payments").select("*").eq("order_id", orderId).single();
      if (retry?.status === "completed") {
        return json(200, {
          status: "already_completed",
          orderId,
          productType: retry.product_type,
          productId: retry.product_id,
          amount: retry.amount,
        });
      }
      return json(500, { error: "UPDATE_FAILED" });
    }

    // 3-6. user_test_access 발급
    if (updated.product_type === "single_test") {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: accessErr } = await admin.from("user_test_access").insert({
        user_id: updated.user_id,
        test_id: updated.product_id,
        payment_id: updated.id,
        expires_at: expiresAt,
      });
      if (accessErr) {
        console.error("user_test_access insert failed for", orderId, accessErr);
        await admin.from("payments").update({
          metadata: {
            ...(updated.metadata ?? {}),
            access_grant_error: accessErr.message,
          },
        }).eq("id", updated.id);
      }
    }

    // 3-7. pro 구독 활성화 + 첫 달 크레딧
    if (updated.product_type === "pro_subscription") {
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const { data: plan } = await admin
        .from("subscription_plans")
        .select("id, ai_credits_monthly")
        .eq("code", "pro_monthly")
        .single();

      if (plan) {
        await admin.from("user_subscriptions")
          .update({ status: "cancelled" })
          .eq("user_id", updated.user_id)
          .eq("status", "active");

        const { error: subErr } = await admin.from("user_subscriptions").insert({
          user_id: updated.user_id,
          plan_id: plan.id,
          status: "active",
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });
        if (subErr) console.error("pro subscription insert failed", orderId, subErr);

        const { error: credErr } = await admin.from("user_credits").insert({
          user_id: updated.user_id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          credits_granted: plan.ai_credits_monthly ?? 50,
          source: "pro_monthly",
        });
        if (credErr) console.error("pro credits insert failed", orderId, credErr);
      } else {
        console.error("pro_monthly plan not found for", orderId);
      }
    }

    return json(200, {
      status: "completed",
      orderId,
      productType: updated.product_type,
      productId: updated.product_id,
      amount: updated.amount,
    });
  } catch (e) {
    console.error("verify-payment error", e);
    return json(500, { error: "INTERNAL", message: String(e) });
  }
});