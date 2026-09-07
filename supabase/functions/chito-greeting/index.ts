import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/* 홈 화면 치토 인사말 생성 — 최근 감정 기록 기반 한 줄 멘트.
 * 크레딧 미차감(홈 진입마다 결제 리스크 없음). 클라이언트가 일 1회 캐시. */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

const EMOTION_LABELS: Record<string, string> = {
  happy: "좋음", calm: "편안함", neutral: "그저 그럼",
  sad: "우울함", angry: "짜증", anxious: "불안",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json(401, { error: "UNAUTHORIZED" });
    const userId = userData.user.id;

    const [{ data: profile }, { data: records }] = await Promise.all([
      admin.from("profiles").select("nickname").eq("id", userId).maybeSingle(),
      admin
        .from("emotion_records")
        .select("primary_emotion, secondary_emotions, situation, recorded_at")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: false })
        .limit(3),
    ]);

    const nickname = profile?.nickname?.trim() || null;
    const summary = (records ?? [])
      .map((r) => {
        const d = new Date(r.recorded_at);
        const label = EMOTION_LABELS[r.primary_emotion] ?? r.primary_emotion;
        const secondary = Array.isArray(r.secondary_emotions) && r.secondary_emotions.length
          ? ` (${r.secondary_emotions.join(", ")})`
          : "";
        const situation = r.situation ? ` — 상황: ${String(r.situation).slice(0, 80)}` : "";
        return `- ${d.getMonth() + 1}/${d.getDate()}: ${label}${secondary}${situation}`;
      })
      .join("\n");

    const now = new Date(Date.now() + 9 * 3600 * 1000); // KST
    const hour = now.getUTCHours();
    const timeContext = hour < 6 ? "새벽" : hour < 12 ? "아침" : hour < 18 ? "낮" : hour < 23 ? "저녁" : "밤 늦은 시간";

    const prompt = `당신은 "치토" — 수험생 심리코칭 서비스 마이치의 감자 캐릭터입니다.
홈 화면에서 사용자를 맞이하는 인사말 한 개를 만드세요.

## 규칙
- 반말, 또래 친구 톤. 1~2문장, 45자 이내. 이모지 금지.
- ${nickname ? `사용자를 "${nickname}"(닉네임)으로 부를 수 있음 (매번은 아니어도 됨).` : `호칭은 "너".`}
- "당신", "친구"(3인칭), 존댓말 금지. 평가·진단 표현 금지.
- 최근 감정 기록이 있으면 그 내용을 자연스럽게 한 번 짚어주기 (원문을 그대로 인용하지 말고 부드럽게).
- 기록이 없으면 오늘 마음을 물어보는 초대로.
- 지금은 ${timeContext}입니다. 시간대에 어울리게.
- 인사말 텍스트만 출력. 따옴표 없이.

## 최근 감정 기록 (최신순)
${summary || "(기록 없음)"}`;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages: [{ role: "user", content: prompt }],
          // Gemini 2.5는 내부 thinking 토큰이 max_tokens에 포함됨 —
          // 200으로 잡으면 생각하다 출력이 잘리므로 넉넉하게. (길이는 프롬프트가 통제)
          max_tokens: 2048,
        }),
      },
    );

    if (!res.ok) {
      const t = await res.text();
      console.error("gemini error", res.status, t.slice(0, 300));
      return json(502, { error: "UPSTREAM_FAILED" });
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const greeting = (choice?.message?.content ?? "").trim().replace(/^["“]|["”]$/g, "");
    // 토큰 한도로 잘린 응답은 캐시되면 하루 종일 잘린 채 보이므로 실패 처리 (클라이언트 폴백)
    if (!greeting || choice?.finish_reason === "length") {
      console.error("greeting truncated or empty", { finish_reason: choice?.finish_reason });
      return json(502, { error: "TRUNCATED" });
    }

    return json(200, { greeting });
  } catch (e) {
    console.error("chito-greeting error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
