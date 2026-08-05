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

    // 3-4. PG 검증 — 토스페이먼츠 결제 승인 API
    // 가맹 계약 전에는 문서 공용 테스트 시크릿 키로 동작 (실청구 없음).
    // mock_ 키는 ALLOW_MOCK_PAYMENTS=true일 때만 허용 (개발용 시뮬레이터).
    const TOSS_SECRET_KEY =
      Deno.env.get("TOSS_SECRET_KEY") ?? "test_sk_docs_OaPz8L5KdmQXkzRz3y47BMw6";
    const allowMock = Deno.env.get("ALLOW_MOCK_PAYMENTS") === "true";
    const isMockKey = typeof paymentKey === "string" && paymentKey.startsWith("mock_");

    let pgAmount: number;
    let pgResponse: Record<string, unknown> | null = null;

    if (isMockKey) {
      if (!allowMock) {
        await admin.from("payments").update({
          status: "failed",
          failed_at: new Date().toISOString(),
          metadata: {
            ...(payment.metadata ?? {}),
            fail_reason: "MOCK_NOT_ALLOWED",
            payment_key: paymentKey,
          },
        }).eq("order_id", orderId).eq("status", "pending");
        return json(400, { error: "PG_VERIFY_FAILED" });
      }
      pgAmount = amount;
    } else {
      const confirmRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(TOSS_SECRET_KEY + ":")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });
      const confirmBody = await confirmRes.json().catch(() => null);

      if (!confirmRes.ok) {
        const failCode = confirmBody?.code ?? "PG_VERIFY_FAILED";
        const failMessage = confirmBody?.message ?? "결제 승인에 실패했습니다";
        console.error("toss confirm failed", orderId, confirmRes.status, failCode, failMessage);
        await admin.from("payments").update({
          status: "failed",
          failed_at: new Date().toISOString(),
          metadata: {
            ...(payment.metadata ?? {}),
            fail_reason: failCode,
            fail_message: failMessage,
            payment_key: paymentKey,
          },
        }).eq("order_id", orderId).eq("status", "pending");
        return json(400, { error: failCode, message: failMessage });
      }

      pgAmount = Number(confirmBody?.totalAmount ?? amount);
      pgResponse = {
        method: confirmBody?.method,
        approvedAt: confirmBody?.approvedAt,
        receiptUrl: confirmBody?.receipt?.url,
        totalAmount: confirmBody?.totalAmount,
        status: confirmBody?.status,
      };
    }

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
            pg: pgResponse,
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

    // 3-8. 크레딧 팩 지급
    if (updated.product_type === "credit_pack") {
      const packCredits = updated.product_id === "credit-pack-30" ? 30 : 10;
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const { error: packErr } = await admin.from("user_credits").insert({
        user_id: updated.user_id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        credits_granted: packCredits,
        source: "credit_pack",
      });
      if (packErr) console.error("credit pack insert failed", orderId, packErr);
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