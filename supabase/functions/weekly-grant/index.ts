import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-cron-secret, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return json(403, { error: "FORBIDDEN" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: proData, error: proErr } = await supabase.rpc("grant_weekly_pro_benefits");
  if (proErr) {
    console.error("pro rpc error", proErr);
    return json(500, { error: proErr.message });
  }
  const proGranted = Array.isArray(proData) && proData.length > 0 ? proData[0].granted_count : 0;

  const { data: acData, error: acErr } = await supabase.rpc("grant_weekly_academy_benefits");
  if (acErr) {
    console.error("academy rpc error", acErr);
    return json(500, { error: acErr.message });
  }
  const academyGranted = Array.isArray(acData) && acData.length > 0 ? acData[0].granted_count : 0;

  console.log("weekly-grant success", { proGranted, academyGranted });
  return json(200, { ok: true, pro: proGranted, academy: academyGranted });
});
