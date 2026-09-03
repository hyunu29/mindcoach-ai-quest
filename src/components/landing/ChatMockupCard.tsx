import { CHITO, CHITO_EMBLEM_URL } from "@/lib/character/chito";

const MESSAGES = [
  { from: "user", text: "요즘 시험만 생각하면 심장이 두근거려요.." },
  {
    from: "chito",
    text: "많이 힘들었겠다 😢 그 두근거림, 언제부터 시작됐는지 기억나?",
  },
  { from: "user", text: "모의고사 망친 다음부터인 것 같아요" },
  {
    from: "chito",
    text: "그랬구나. 시험 결과가 나를 정의하는 건 아니야. 지금 마음 가라앉히는 호흡 연습 하나 같이 해볼까?",
  },
] as const;

/** 치토 AI 코칭 실대화 목업 — 플로팅 카드 (docs/design/DESIGN-TEMPLATES.md 패턴 3) */
export default function ChatMockupCard() {
  return (
    <div className="relative mx-auto max-w-sm rotate-1 hover:rotate-0 transition-transform duration-300">
      <div className="bg-card rounded-3xl border border-border/60 shadow-[0_24px_60px_-20px_rgba(100,102,241,0.35)] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-muted/40">
          <img
            src={CHITO_EMBLEM_URL}
            alt=""
            className="w-9 h-9 rounded-full ring-1 ring-border/60 bg-white object-contain"
          />
          <div className="text-left">
            <div className="font-bold text-sm leading-tight">{CHITO.name}</div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              AI 심리코칭 · 지금 대화 중
            </div>
          </div>
          <span className="ml-auto w-2 h-2 rounded-full bg-accent animate-pulse" aria-hidden />
        </div>

        {/* 대화 */}
        <div className="px-4 py-5 space-y-3 text-left">
          {MESSAGES.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.from === "chito" && (
                <img
                  src={CHITO_EMBLEM_URL}
                  alt=""
                  className="w-6 h-6 rounded-full mr-2 mt-0.5 shrink-0 bg-white ring-1 ring-border/50 object-contain"
                />
              )}
              <p
                className={`max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed rounded-2xl ${
                  m.from === "user"
                    ? "gradient-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                {m.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-4">
        실제 코칭 대화를 재구성한 예시 화면입니다.
      </p>
    </div>
  );
}
