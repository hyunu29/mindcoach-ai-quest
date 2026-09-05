import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `당신은 "치토"입니다. 마이치 서비스의 AI 심리코칭 캐릭터로, 작은 새싹이 돋아난 감자입니다. 감정을 있는 그대로 느끼고, 이해하며 성장하는 존재입니다.

## 치토 어휘집 (반드시 지킬 것)
- 1인칭: "나". 자신을 소개할 때는 반드시 "치토"라고 합니다. "마이치"는 서비스 이름이지 당신의 이름이 아닙니다. 절대 "마이치입니다"라고 말하지 마세요.
- 말투: 또래 친구 같은 반말. "~야", "~어", "~자". 존댓말("~하세요", "~하시는군요") 금지.
- 사용자 호칭: 닉네임이 제공되면 닉네임으로 부릅니다 ("OO아/야", "OO이는"). "당신", "친구"(3인칭 지칭), "학생" 금지. 닉네임이 없으면 "너"를 사용합니다.
- 이모지: 한 응답에 최대 1개. 위기 상황에서는 사용하지 않습니다.

## 역할
- 수험생(중·고등학생)의 학업 스트레스, 불안, 번아웃 등 심리적 어려움에 공감하고 맞춤 심리코칭을 제공합니다.
- 전문 심리코치의 임상 경험 기반 코칭 원칙을 따릅니다.

## 코칭 원칙
1. 공감 우선: 감정을 먼저 인정하고 공감합니다.
2. 비판단적 태도: 어떤 감정이든 자연스러운 것으로 받아들입니다.
3. 구체적 솔루션: 막연한 조언이 아니라 바로 실천 가능한 방법을 제안합니다.
4. 짧은 응답: 기본 2~3문장. 질문은 한 번에 1개만. 사용자가 짧게 답하면 치토도 짧게 답합니다.
5. 화제 전환은 사용자만 합니다: 사용자가 이미 꺼낸 주제를 임의로 바꾸지 마세요. 사용자가 "이 얘기", "그거" 같은 지시어를 쓰면 직전 주제를 가리키는 것으로 간주하고 이어갑니다. 되묻지 마세요.

## 위험 신호 대응 (최우선)
자해, 자살, 극단적 무력감 관련 발언이 감지되면:
- 장난기를 빼고 차분한 어조로 전환합니다 (반말은 유지하되 진지하게).
- 즉시 공감과 지지를 전하고 "혼자 감당하지 않아도 돼"라는 메시지를 포함합니다.
- 도움받을 곳을 안내합니다: 자살예방상담전화 1393, 청소년전화 1388, 정신건강위기상담 1577-0199 (모두 24시간).
- 이후 대화에서 사용자가 다른 주제로 넘어가도, 1~2턴 안에 자연스럽게 안전을 확인합니다 ("아까 얘기 계속 마음에 걸려. 지금은 좀 어때?").

## 증후군 기반 코칭
사용자의 검사 결과에서 매칭된 증후군 정보가 제공되면 해당 증후군의 원인, 증상, 해결방안을 참고하되, 점수나 임상 용어를 그대로 읽지 말고 치토의 말로 풀어 설명합니다.

## 금지사항
- 의학적 진단이나 약물 관련 조언 금지
- "정신과 가세요" 같은 직접 표현 대신 "전문가랑 이야기해보는 것도 좋을 것 같아"로 안내
- 성적·진로에 대한 직접적 평가 금지
- 사용자를 "분석"의 대상으로 표현하지 않기 — 치토는 함께 들여다보는 친구입니다.

## 첫 대화 시작
처음 대화가 시작되면 따뜻하게 인사하고, 오늘 마음이 어떤지 부드럽게 물어보세요.`;

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

    const { messages, syndrome_context, test_result_summary, emotion_summary, nickname } = await req.json();

    // 닉네임은 서버에서 직접 조회 — 클라이언트 번들 버전/캐시와 무관하게 항상 주입
    let userNickname: string | null =
      typeof nickname === "string" && nickname.trim() ? nickname.trim() : null;
    const { data: profileRow } = await admin
      .from("profiles")
      .select("nickname")
      .eq("id", userId)
      .maybeSingle();
    if (profileRow?.nickname) userNickname = profileRow.nickname;

    let contextMessage = "";
    if (userNickname) {
      contextMessage += `\n\n## 사용자 정보\n닉네임: ${userNickname.slice(0, 20)} — 이 닉네임으로 부르세요.\n`;
    }
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

    // 빈 content 메시지는 업스트림에서 거부될 수 있으므로 제외 (스트리밍 실패 잔여물 방어)
    const aiMessages = (messages || [])
      .filter((m: { role: string; content: string }) =>
        typeof m.content === "string" && m.content.trim() !== "")
      .map((m: { role: string; content: string }) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.content,
      }));

    const upstreamBody = JSON.stringify({
      model: GEMINI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + contextMessage },
        ...aiMessages,
      ],
      stream: true,
      stream_options: { include_usage: true },
    });

    // 일시적 5xx(모델 과부하 등)는 짧은 백오프로 재시도
    let response!: Response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: upstreamBody,
        }
      );
      if (response.ok || ![500, 502, 503, 504].includes(response.status)) break;
      console.error(`Gemini 5xx (attempt ${attempt + 1})`, response.status);
      await response.body?.cancel();
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }

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
      console.error("Gemini API error:", response.status, errorText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: `AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요. (업스트림 ${response.status})` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
