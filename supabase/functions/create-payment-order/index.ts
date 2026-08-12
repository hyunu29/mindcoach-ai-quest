import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { findProduct, ACADEMY_SINGLE_TEST_PRICE, type ProductType } from "../_shared/pricing.ts";

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
      | { productType?: ProductType; productId?: string }
      | null;
    if (!body?.productType || !body?.productId) {
      return json(400, { error: "INVALID_BODY" });
    }

    const product = findProduct(body.productType, body.productId);
    if (!product) return json(400, { error: "PRODUCT_NOT_FOUND" });

    const orderId = `order_${crypto.randomUUID()}`;
    const admin = createClient(supabaseUrl, serviceKey);

    // 학원 연결 학생은 검사 단품 학원 혜택가 적용 (2026-08-12 가격 확정)
    let amount = product.amount;
    let academyBenefit = false;
    if (product.productType === "single_test") {
      const { data: profile } = await admin
        .from("profiles")
        .select("academy_id")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.academy_id) {
        amount = ACADEMY_SINGLE_TEST_PRICE;
        academyBenefit = true;
      }
    }

    const { error: insertErr } = await admin.from("payments").insert({
      user_id: userId,
      provider: "toss",
      order_id: orderId,
      amount,
      currency: "KRW",
      status: "pending",
      product_type: product.productType,
      product_id: product.productId,
      metadata: academyBenefit ? { academy_benefit_price: true } : {},
    });
    if (insertErr) {
      console.error("payments insert failed", insertErr);
      return json(500, { error: "INSERT_FAILED", message: insertErr.message });
    }

    return json(200, { orderId, amount, productName: product.name });
  } catch (e) {
    console.error("create-payment-order error", e);
    return json(500, { error: "INTERNAL", message: String(e) });
  }
});