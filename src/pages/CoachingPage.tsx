import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Bot,
  Plus,
  MessageSquare,
  Phone,
  AlertTriangle,
  Lightbulb,
  Heart,
  Target,
  ChevronLeft,
  Menu,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────── */

interface TipCard {
  icon: "lightbulb" | "heart" | "target";
  title: string;
  description: string;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  tipCard?: TipCard;
}

interface Conversation {
  id: string;
  title: string;
  date: string;
  messages: ChatMessage[];
  syndromes: string[];
}

/* ─── Crisis keywords ────────────────────────────── */

const CRISIS_KEYWORDS = [
  "자해",
  "자살",
  "죽고 싶",
  "죽고싶",
  "살기 싫",
  "살기싫",
  "목숨",
  "끝내고 싶",
  "끝내고싶",
];

/* ─── Scripted AI responses (4 turns) ────────────── */

const scriptedResponses: ChatMessage[] = [
  {
    role: "ai",
    content:
      "그렇군요. 비교하는 마음이 들 때 정말 힘들 수 있어요. 특히 시험 기간에는 그런 감정이 더 강해지죠. 혹시 최근에 가장 비교가 심했던 구체적인 상황이 있었나요? 조금 더 이야기해 주시면 함께 살펴볼게요.",
  },
  {
    role: "ai",
    content:
      "친구의 성적을 보고 불안해지는 건 아주 자연스러운 반응이에요. 하지만 비교는 객관적인 것이 아니라 **내가 선택하는 시선**이에요. 한 가지 방법을 알려드릴게요.",
    tipCard: {
      icon: "lightbulb",
      title: "3-2-1 리프레이밍 기법",
      description:
        "비교 생각이 들 때: ① 내가 잘한 것 3가지 적기 ② 지금 감사한 것 2가지 떠올리기 ③ 내일 하고 싶은 것 1가지 정하기. 이 방법으로 시선을 나에게 돌려보세요.",
    },
  },
  {
    role: "ai",
    content:
      "좋아요! 리프레이밍 기법을 연습해 보기로 한 것 자체가 큰 첫걸음이에요. 🎯 이번 주 실천 과제를 하나 드릴게요.",
    tipCard: {
      icon: "target",
      title: "이번 주 실천 과제",
      description:
        "매일 잠들기 전 5분, 오늘 하루 나에게 칭찬 한마디를 노트에 적어보세요. 작은 것이어도 괜찮아요. 일주일 후에 모아서 함께 읽어볼까요?",
    },
  },
  {
    role: "ai",
    content:
      "정말 잘하고 계세요! 😊 스스로를 돌보겠다는 마음이 가장 중요한 출발점이에요. 힘들 때는 언제든 여기로 돌아와 주세요. 마인드코치 AI는 항상 당신 편이에요. 💜 다음에 또 이야기 나눠요!",
  },
];

/* ─── Sample conversations ────────────────────────── */

const sampleConversations: Conversation[] = [
  {
    id: "today",
    title: "비교불안 코칭",
    date: "오늘",
    syndromes: ["비교불안 증후군", "SNS 의존 증후군"],
    messages: [
      {
        role: "ai",
        content:
          '안녕하세요! 마인드코치 AI입니다 😊 최근 검사 결과를 보니 "비교불안 증후군"에 해당하는 부분이 있네요. 요즘 어떤 점이 가장 힘드신가요?',
      },
    ],
  },
  {
    id: "yesterday",
    title: "시험불안 상담",
    date: "어제",
    syndromes: ["시험불안 증후군"],
    messages: [
      {
        role: "ai",
        content:
          '안녕하세요! 마인드코치 AI입니다 😊 시험불안 증후군에 대해 이야기해 볼까요? 시험이 다가올 때 가장 힘든 점이 무엇인가요?',
      },
      { role: "user", content: "시험만 생각하면 머리가 하얘져요." },
      {
        role: "ai",
        content:
          "시험 전 긴장으로 머리가 하얘지는 건 흔한 경험이에요. 이럴 때 도움이 되는 호흡법을 알려드릴게요.",
        tipCard: {
          icon: "heart",
          title: "4-7-8 호흡법",
          description:
            "4초 들이쉬고, 7초 참고, 8초 내쉬기. 시험 시작 전 3회 반복하면 긴장이 크게 완화됩니다.",
        },
      },
    ],
  },
  {
    id: "lastweek",
    title: "번아웃 코칭",
    date: "3월 15일",
    syndromes: ["학업 번아웃 증후군"],
    messages: [
      {
        role: "ai",
        content:
          '안녕하세요! 마인드코치 AI입니다 😊 "학업 번아웃 증후군" 결과가 나왔네요. 요즘 공부할 때 어떤 기분이 드시나요?',
      },
    ],
  },
];

/* ─── Icon map for tip cards ─────────────────────── */

const tipIconMap = {
  lightbulb: Lightbulb,
  heart: Heart,
  target: Target,
};

/* ─── Component ──────────────────────────────────── */

export default function CoachingPage() {
  const [conversations, setConversations] = useState<Conversation[]>(sampleConversations);
  const [activeId, setActiveId] = useState("today");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId)!;

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active.messages, isTyping]);

  const checkCrisis = (text: string) => {
    return CRISIS_KEYWORDS.some((kw) => text.includes(kw));
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    const text = input.trim();

    // Crisis detection
    if (checkCrisis(text)) {
      setShowCrisisBanner(true);
    }

    const userMsg: ChatMessage = { role: "user", content: text };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, messages: [...c.messages, userMsg] } : c
      )
    );
    setInput("");
    setIsTyping(true);

    // Pick scripted response or fallback
    const responseIndex = Math.min(turnCount, scriptedResponses.length - 1);
    const aiResponse = scriptedResponses[responseIndex];

    setTimeout(() => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, messages: [...c.messages, aiResponse] } : c
        )
      );
      setIsTyping(false);
      setTurnCount((t) => t + 1);
    }, 1500);
  };

  const handleNewConversation = () => {
    const newId = `new-${Date.now()}`;
    const newConvo: Conversation = {
      id: newId,
      title: "새 대화",
      date: "오늘",
      syndromes: [],
      messages: [
        {
          role: "ai",
          content:
            "안녕하세요! 마인드코치 AI입니다 😊 오늘 어떤 이야기를 나눠볼까요? 학업 고민, 시험 불안, 스트레스 관리 등 무엇이든 편하게 말씀해 주세요.",
        },
      ],
    };
    setConversations((prev) => [newConvo, ...prev]);
    setActiveId(newId);
    setTurnCount(0);
    setShowCrisisBanner(false);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] animate-fade-in -mx-4 md:-mx-8 -mt-4 md:-mt-8">
      {/* ── Sidebar (conversations list) ── */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:relative z-50 md:z-auto top-0 left-0 h-full
          w-72 bg-card border-r border-border/50 flex flex-col
          transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          md:w-64 shrink-0
        `}
      >
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="font-bold text-sm">대화 목록</h2>
          <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={handleNewConversation}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveId(c.id);
                setTurnCount(0);
                setShowCrisisBanner(false);
                setSidebarOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors text-sm active:scale-[0.98] ${
                activeId === c.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="truncate">{c.title}</span>
              </div>
              <span className="text-[10px] text-muted-foreground ml-6">{c.date}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3 shrink-0 bg-card/50">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg h-8 w-8 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm">마인드코치</div>
            <div className="text-[10px] text-muted-foreground">AI 심리 코칭</div>
          </div>
        </div>

        {/* Syndrome badges */}
        {active.syndromes.length > 0 && (
          <div className="px-4 py-2 border-b border-border/50 flex gap-2 flex-wrap bg-card/30">
            {active.syndromes.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="text-[10px] font-medium bg-secondary/10 text-secondary border-secondary/20"
              >
                {s}
              </Badge>
            ))}
          </div>
        )}

        {/* Crisis banner */}
        {showCrisisBanner && (
          <div className="mx-4 mt-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4 animate-reveal-up">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive mb-1">
                  혼자 감당하지 않아도 됩니다.
                </p>
                <p className="text-xs text-destructive/80 mb-3">
                  지금 도움을 받을 수 있습니다. 전문 상담 전화에 연락해 주세요.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <a
                    href="tel:1393"
                    className="inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:bg-destructive/90 transition-colors active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    자살예방상담전화 1393
                  </a>
                  <a
                    href="tel:1588-9191"
                    className="inline-flex items-center gap-1.5 bg-card border border-destructive/30 text-destructive text-xs font-semibold px-3 py-2 rounded-lg hover:bg-destructive/5 transition-colors active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    정신건강위기상담 1577-0199
                  </a>
                </div>
              </div>
              <button
                onClick={() => setShowCrisisBanner(false)}
                className="text-destructive/50 hover:text-destructive text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" ref={scrollRef}>
          {active.messages.map((msg, i) => (
            <div key={i}>
              <div className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "ai" && (
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "gradient-primary text-primary-foreground rounded-br-md shadow-sm"
                      : "bg-card border border-secondary/20 rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>

              {/* Tip card */}
              {msg.tipCard && (
                <div className="ml-10 mt-2">
                  <TipCardComponent card={msg.tipCard} />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-card border border-secondary/20 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-secondary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-secondary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border/50 bg-card/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="rounded-xl border-border/50"
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
              disabled={isTyping}
            />
            <Button
              size="icon"
              variant="default"
              className="rounded-xl shrink-0 gradient-primary"
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Tip Card sub-component ─────────────────────── */

function TipCardComponent({ card }: { card: TipCard }) {
  const Icon = tipIconMap[card.icon];
  return (
    <div className="bg-secondary/5 border border-secondary/15 rounded-xl p-4 max-w-[80%] animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-secondary/15 flex items-center justify-center">
          <Icon className="w-4 h-4 text-secondary" />
        </div>
        <span className="font-semibold text-sm">{card.title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
    </div>
  );
}
