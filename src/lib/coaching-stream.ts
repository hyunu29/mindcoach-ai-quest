import { ChatMessage } from "./coaching-types";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://bnhnaaarsyauppdbrbco.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuaG5hYWFyc3lhdXBwZGJyYmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODc5NzMsImV4cCI6MjA4OTc2Mzk3M30.Cbd6nbPGuOMHfZ7oHDTmAhMgx_luVxh1gDyFO4UqfYM";

const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat-coaching`;

interface StreamChatParams {
  messages: ChatMessage[];
  syndromeContext?: {
    name: string;
    description?: string;
    causes?: string[];
    symptoms?: string[];
    solutions?: string[];
  } | null;
  testResultSummary?: string | null;
  emotionSummary?: string | null;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamCoachingChat({
  messages,
  syndromeContext,
  testResultSummary,
  emotionSummary,
  onDelta,
  onDone,
  onError,
}: StreamChatParams) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      syndrome_context: syndromeContext || null,
      test_result_summary: testResultSummary || null,
      emotion_summary: emotionSummary || null,
    }),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ error: "AI 응답 생성에 실패했습니다." }));
    onError(errorData.error || "AI 응답 생성에 실패했습니다.");
    return;
  }

  if (!resp.body) {
    onError("스트리밍을 시작할 수 없습니다.");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}
