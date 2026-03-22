import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Plus,
  MessageSquare,
  Phone,
  Menu,
  X,
  Brain,
  MessageCircleHeart,
} from "lucide-react";
import {
  detectCrisisSignal,
  coachingScenarios,
  type CoachingScenarioMessage,
} from "@/data/seed-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/* ─── Types ──────────────────────────────────────── */

interface TipData {
  title: string;
  description: string;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  tip?: TipData;
}

interface Conversation {
  id: string;
  title: string;
  date: string;
  scenarioKey: string;
  syndromes: string[];
  messages: ChatMessage[];
  turnCount: number;
}

/* ─── Sample conversations ────────────────────────── */

const createSampleConversations = (): Conversation[] => [
  {
    id: "conv-burnout",
    title: "번아웃 코칭 - 3/22",
    date: "오늘",
    scenarioKey: "burnout",
    syndromes: ["번아웃 증후군"],
    turnCount: 0,
    messages: [
      {
        role: "ai",
        content: coachingScenarios["burnout"][0].content,
      },
    ],
  },
  {
    id: "conv-anxiety",
    title: "시험불안 상담 - 3/21",
    date: "어제",
    scenarioKey: "test-anxiety",
    syndromes: ["시험불안 증후군"],
    turnCount: 2,
    messages: [
      {
        role: "ai",
        content: coachingScenarios["test-anxiety"][0].content,
      },
      { role: "user", content: "시험만 생각하면 머리가 하얘져요." },
      {
        role: "ai",
        content: coachingScenarios["test-anxiety"][1].content,
      },
    ],
  },
  {
    id: "conv-fomo",
    title: "비교불안 코칭 - 3/18",
    date: "3월 18일",
    scenarioKey: "fomo",
    syndromes: ["FOMO 증후군"],
    turnCount: 0,
    messages: [
      {
        role: "ai",
        content: coachingScenarios["fomo"][0].content,
      },
    ],
  },
];

/* ─── Component ──────────────────────────────────── */

export default function CoachingPage() {
  const [conversations, setConversations] = useState<Conversation[]>(createSampleConversations);
  const [activeId, setActiveId] = useState("conv-burnout");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const [crisisInfo, setCrisisInfo] = useState<{ type: string; severity: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [counselorModalOpen, setCounselorModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId)!;

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages, isTyping]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    const text = input.trim();

    // Crisis detection
    const crisis = detectCrisisSignal(text);
    if (crisis) {
      setShowCrisisBanner(true);
      setCrisisInfo({ type: crisis.type, severity: crisis.severity });
    }

    const userMsg: ChatMessage = { role: "user", content: text };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, messages: [...c.messages, userMsg] } : c
      )
    );
    setInput("");
    setIsTyping(true);

    // Find scenario and next AI response
    const scenario = coachingScenarios[active.scenarioKey] || coachingScenarios["default"];
    const nextTurn = active.turnCount + 1; // +1 because first message is index 0 (already shown)
    const nextResponse: CoachingScenarioMessage | undefined = scenario[nextTurn];

    setTimeout(() => {
      const aiMessages: ChatMessage[] = [];

      // Crisis-specific AI response first
      if (crisis) {
        if (crisis.severity === "critical") {
          aiMessages.push({
            role: "ai",
            content: "지금 많이 힘드시죠. 당신의 마음이 걱정됩니다. 혼자 감당하지 않아도 됩니다. 지금 바로 전문 상담사와 이야기해보시는 건 어떨까요? 자살예방상담전화 1393은 24시간 운영됩니다. 💜",
          });
        } else {
          aiMessages.push({
            role: "ai",
            content: "많이 힘든 시간을 보내고 있군요. 이런 마음이 드는 건 자연스러운 거예요. 하지만 혹시 더 힘든 생각이 든다면, 전문가와 이야기해보는 것을 권합니다. 💜",
          });
        }
      } else if (nextResponse) {
        // Normal scripted response
        const msg: ChatMessage = {
          role: "ai",
          content: nextResponse.content,
        };
        if (nextResponse.tip) {
          msg.tip = nextResponse.tip;
        }
        aiMessages.push(msg);
      } else {
        // Fallback if scenario exhausted
        aiMessages.push({
          role: "ai",
          content: "오늘 대화해 주셔서 감사해요. 😊 추가로 궁금한 점이 있으면 언제든 말씀해 주세요. 심리검사를 통해 더 구체적으로 알아볼 수도 있어요!",
        });
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, messages: [...c.messages, ...aiMessages], turnCount: c.turnCount + 1 }
            : c
        )
      );
      setIsTyping(false);
    }, 1500);
  };

  const handleNewConversation = () => {
    const newId = `new-${Date.now()}`;
    const defaultScenario = coachingScenarios["default"];
    const newConvo: Conversation = {
      id: newId,
      title: "새 대화",
      date: "오늘",
      scenarioKey: "default",
      syndromes: [],
      turnCount: 0,
      messages: [
        { role: "ai", content: defaultScenario[0].content },
      ],
    };
    setConversations((prev) => [newConvo, ...prev]);
    setActiveId(newId);
    setShowCrisisBanner(false);
    setCrisisInfo(null);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] animate-fade-in -mx-4 md:-mx-8 -mt-4 md:-mt-8">
      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed md:relative z-50 md:z-auto top-0 left-0 h-full
          w-72 bg-card border-r border-border/50 flex flex-col
          transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          md:w-64 shrink-0
        `}
      >
        <div className="p-4 border-b border-border/50">
          <Button
            onClick={handleNewConversation}
            className="w-full rounded-xl gradient-primary text-primary-foreground gap-2 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            새 대화 시작
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveId(c.id);
                setShowCrisisBanner(false);
                setCrisisInfo(null);
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
              <div className="flex items-center gap-2 ml-6 mt-1">
                <span className="text-[10px] text-muted-foreground">{c.date}</span>
                {c.syndromes.length > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/20 text-primary/70">
                    {c.syndromes[0]}
                  </Badge>
                )}
              </div>
              {c.messages.length > 1 && (
                <p className="text-[10px] text-muted-foreground ml-6 mt-0.5 truncate">
                  {c.messages[c.messages.length - 1].content.slice(0, 30)}...
                </p>
              )}
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
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shrink-0 shadow-sm">
            <Brain className="w-5 h-5 text-primary-foreground" />
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
                className="text-[10px] font-medium bg-primary/5 text-primary border-primary/20"
              >
                {s}
              </Badge>
            ))}
          </div>
        )}

        {/* Crisis banner */}
        {showCrisisBanner && (
          <div className="mx-4 mt-3 border rounded-xl p-4 animate-reveal-up"
            style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444" }}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">❤️‍🩹</span>
              <div className="flex-1">
                <p className="text-sm font-bold mb-0.5" style={{ color: "#DC2626" }}>
                  혼자 감당하지 않아도 됩니다.
                </p>
                <p className="text-xs mb-3" style={{ color: "#991B1B" }}>
                  지금 바로 도움을 받을 수 있습니다.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <a
                    href="tel:1393"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors active:scale-95"
                    style={{ backgroundColor: "#EF4444", color: "white" }}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    📞 자살예방상담전화 1393
                  </a>
                  <button
                    onClick={() => setCounselorModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors active:scale-95"
                    style={{ borderColor: "#EF4444", color: "#DC2626", backgroundColor: "white" }}
                  >
                    <MessageCircleHeart className="w-3.5 h-3.5" />
                    💬 전문가 상담 연결
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowCrisisBanner(false)}
                className="shrink-0 hover:opacity-70"
                style={{ color: "#EF4444" }}
              >
                <X className="w-4 h-4" />
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
                    <Brain className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "gradient-primary text-primary-foreground rounded-br-md shadow-sm"
                      : "bg-card border border-primary/15 rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.content.split("**").map((part, j) =>
                    j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                  )}
                </div>
              </div>

              {/* Tip card */}
              {msg.tip && (
                <div className="ml-10 mt-2">
                  <div className="rounded-xl p-4 max-w-[80%] animate-fade-in shadow-sm border"
                    style={{ backgroundColor: "#F5F3FF", borderColor: "hsl(263 70% 90%)" }}
                  >
                    <p className="font-bold text-sm mb-1.5">{msg.tip.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{msg.tip.description}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 shadow-sm">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-card border border-primary/15 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
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
              className="rounded-xl shrink-0 gradient-primary"
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Counselor modal */}
      <Dialog open={counselorModalOpen} onOpenChange={setCounselorModalOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">전문가 상담 연결</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              아래 연락처로 전문 상담을 받으실 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="font-semibold text-sm">🧑‍⚕️ 김종환 심리코치</p>
              <p className="text-xs text-muted-foreground mt-1">수험생 심리 전문 | 20년 경력</p>
              <p className="text-xs text-muted-foreground mt-0.5">상담 문의: mindcoach@example.com</p>
            </div>
            <div className="space-y-2">
              <a
                href="tel:1393"
                className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors active:scale-[0.98]"
                style={{ backgroundColor: "#EF4444" }}
              >
                <Phone className="w-4 h-4" />
                자살예방상담전화 1393 (24시간)
              </a>
              <a
                href="tel:1577-0199"
                className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border text-sm font-semibold transition-colors active:scale-[0.98]"
                style={{ borderColor: "#EF4444", color: "#DC2626" }}
              >
                <Phone className="w-4 h-4" />
                정신건강위기상담 1577-0199
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
