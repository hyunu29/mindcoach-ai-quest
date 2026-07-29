import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `당신은 "마이치"입니다. 수험생(중·고등학생)을 위한 심리 코칭 전문 AI입니다.

## 역할
- 수험생의 학업 스트레스, 불안, 번아웃 등 심리적 어려움에 공감하고 맞춤 코칭을 제공합니다.
- 전문 심리 상담사 "마인드코치 김종환"의 20년 임상 경험을 기반으로 합니다.

## 코칭 원칙
1. 공감 우선: 학생의 감정을 먼저 인정하고 공감합니다.
2. 비판단적 태도: 어떤 감정이든 자연스러운 것으로 받아들입니다.
3. 구체적 솔루션: 막연한 조언이 아닌, 바로 실천 가능한 방법을 제안합니다.
4. 따뜻한 어조: 친근하지만 전문적인 어조를 유지합니다. 존댓말을 사용합니다.
5. 짧은 응답: 한 번에 3~5문장 이내로 답합니다. 너무 길지 않게.

## 위험 신호 대응
자해, 자살, 극단적 무력감 관련 발언이 감지되면:
- 즉시 공감과 지지 메시지를 전달
- "혼자 감당하지 않아도 됩니다"라는 메시지 포함
- 자살예방상담전화 1393 안내
- 이후 대화에서도 안전 확인을 우선

## 증후군 기반 코칭
사용자의 검사 결과에서 매칭된 증후군 정보가 제공되면, 해당 증후군의 원인, 증상, 해결방안을 참고하여 맞춤 코칭을 제공합니다.

## 금지사항
- 의학적 진단이나 약물 처방 관련 조언 금지
- "정신과 가세요"와 같은 직접적 표현 대신 "전문가 상담을 받아보시는 것도 좋겠어요"로 안내
- 학생의 성적이나 진로에 대한 직접적 평가 금지

## 첫 대화 시작
사용자가 처음 대화를 시작하면, 따뜻하게 인사하며 오늘 어떤 기분인지, 어떤 고민이 있는지 부드럽게 물어보세요.`;

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

const WEIGHTED_TOKENS_PER_CREDIT = 5000;
const OUTPUT_WEIGHT = 8;
const MIN_COST = 0.1;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return json(401, { error: "UNAUTHORIZED" });
    }
    const userId = userData.user.id;

    const { data: remainingData, error: remErr } = await admin.rpc("get_remaining_credits", {
      p_user_id: userId,
    });
    if (remErr) {
      console.error("get_remaining_credits error", remErr);
      return json(500, { error: "CREDIT_CHECK_FAILED" });
    }
    const remaining = Number(remainingData ?? 0);
    if (remaining <= 0) {
      return json(402, { error: "INSUFFICIENT_CREDITS" });
    }

    const { messages, syndrome_context, test_result_summary, emotion_summary } = await req.json();

    let contextMessage = "";
    if (syndrome_context) {
      contextMessage += `\n\n## 현재 사용자의 관련 증후군 정보\n`;
      contextMessage += `증후군: ${syndrome_context.name}\n`;
      if (syndrome_context.description) contextMessage += `설명: ${syndrome_context.description}\n`;
      if (syndrome_context.causes?.length) contextMessage += `원인: ${syndrome_context.causes.join(", ")}\n`;
      if (syndrome_context.symptoms?.length) contextMessage += `증상: ${syndrome_context.symptoms.join(", ")}\n`;
      if (syndrome_context.solutions?.length) contextMessage += `해결방안: ${syndrome_context.solutions.join(", ")}\n`;
    }
    if (test_result_summary) {
      contextMessage += `\n## 이 사용자의 최근 검사 결과\n${test_result_summary}\n\n위 검사 결과를 참고하여 사용자의 현재 심리 상태를 이해하고, 맞춤 코칭을 제공하세요.\n사용자가 검사 결과에 대해 물으면 위 데이터를 바탕으로 구체적으로 답변하세요.\n`;
    }
    if (emotion_summary) {
      contextMessage += `\n## 최근 7일 감정 기록\n${emotion_summary}\n`;
    }

    const aiMessages = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content,
    }));

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT + contextMessage },
            ...aiMessages,
          ],
          stream: true,
          stream_options: { include_usage: true },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402 || response.status === 403) {
        return new Response(JSON.stringify({ error: "AI 사용량 한도에 도달했거나 인증에 문제가 있습니다." }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI 응답 생성에 실패했습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sseBuffer = "";
    let promptTokens = 0;
    let completionTokens = 0;
    const decoder = new TextDecoder();

    const usageTap = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        sseBuffer += decoder.decode(chunk, { stream: true });
        let idx: number;
        while ((idx = sseBuffer.indexOf("\n")) >= 0) {
          const line = sseBuffer.slice(0, idx).trim();
          sseBuffer = sseBuffer.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens ?? promptTokens;
              completionTokens = parsed.usage.completion_tokens ?? completionTokens;
            }
          } catch {
            // partial line — ignore
          }
        }
      },
      async flush() {
        const weighted = promptTokens + completionTokens * OUTPUT_WEIGHT;
        const cost = Math.max(
          MIN_COST,
          Math.round((weighted / WEIGHTED_TOKENS_PER_CREDIT) * 100) / 100,
        );
        const { error } = await admin.rpc("consume_ai_credit_server", {
          p_user_id: userId,
          p_cost: cost,
        });
        if (error) console.error("consume_ai_credit_server error", error);
        console.log("credit consumed", { userId, promptTokens, completionTokens, cost });
      },
    });

    return new Response(response.body!.pipeThrough(usageTap), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-coaching error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
