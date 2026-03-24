import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Send, Plus, MessageSquare, Phone, Menu, X, Brain, MessageCircleHeart, Loader2,
} from "lucide-react";
import {
  detectCrisisSignal, coachingScenarios, type CoachingScenarioMessage,
} from "@/data/seed-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

/* ─── Types ──────────────────────────────────────── */

interface TipData { title: string; description: string; }

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  tip?: TipData;
  timestamp?: string;
}

interface DbSession {
  id: string;
  related_syndrome: string | null;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

/* ─── Component ──────────────────────────────────── */

export default function CoachingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const [crisisInfo, setCrisisInfo] = useState<{ type: string; severity: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [counselorModalOpen, setCounselorModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = sessions.find((s) => s.id === activeId);
  const messages = active?.messages || [];

  // Determine scenario key from syndrome
  const getScenarioKey = (syndrome: string | null): string => {
    if (!syndrome) return "default";
    const map: Record<string, string> = {
      "FOMO 증후군": "fomo",
      "번아웃 증후군": "burnout",
      "시험불안 증후군": "test-anxiety",
      "학업 소진 증후군": "burnout",
      "완벽주의 루틴 강박 증후군": "burnout",
      "강박적 공부 증후군": "burnout",
      "만성피로 증후군": "burnout",
      "분노 조절 장애": "burnout",
    };
    return map[syndrome] || "default";
  };

  const getTurnCount = (msgs: ChatMessage[]): number => {
    return msgs.filter((m) => m.role === "user").length;
  };

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  // Init: get user, load sessions
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data, error } = await supabase
        .from("coaching_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }

      const loaded = (data || []).map((row) => ({
        id: row.id,
        related_syndrome: row.related_syndrome,
        messages: (Array.isArray(row.messages) ? row.messages : []) as unknown as ChatMessage[],
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      setSessions(loaded);

      // Check URL params for new session from test results
      const syndrome = searchParams.get("syndrome");
      const resultId = searchParams.get("resultId");
      if (syndrome) {
        // Create new session for this syndrome
        const scenarioKey = getScenarioKey(syndrome);
        const scenario = coachingScenarios[scenarioKey] || coachingScenarios["default"];
        const firstMsg: ChatMessage = {
          role: "ai",
          content: scenario[0].content,
          timestamp: new Date().toISOString(),
        };

        const { data: newSession, error: insertError } = await supabase
          .from("coaching_sessions")
          .insert({
            user_id: user.id,
            related_syndrome: syndrome,
            related_test_result_id: resultId || null,
            messages: [firstMsg] as unknown as Json,
          } as any)
          .select()
          .single();

        if (!insertError && newSession) {
          const ns: DbSession = {
            id: newSession.id,
            related_syndrome: newSession.related_syndrome,
            messages: [firstMsg],
            created_at: newSession.created_at,
            updated_at: newSession.updated_at,
          };
          setSessions((prev) => [ns, ...prev]);
          setActiveId(newSession.id);
        }
      } else if (loaded.length > 0) {
        setActiveId(loaded[0].id);
      }

      setLoading(false);
    };
    init();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isTyping || !active || !userId) return;
    const text = input.trim();

    const crisis = detectCrisisSignal(text);
    if (crisis) {
      setShowCrisisBanner(true);
      setCrisisInfo({ type: crisis.type, severity: crisis.severity });
    }

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    const updatedMsgs = [...messages, userMsg];

    setSessions((prev) => prev.map((s) => s.id === activeId ? { ...s, messages: updatedMsgs } : s));
    setInput("");
    setIsTyping(true);

    // Save user message
    await supabase
      .from("coaching_sessions")
      .update({ messages: updatedMsgs as unknown as Record<string, unknown>[], updated_at: new Date().toISOString() })
      .eq("id", activeId);

    // Find AI response
    const scenarioKey = getScenarioKey(active.related_syndrome);
    const scenario = coachingScenarios[scenarioKey] || coachingScenarios["default"];
    const turnCount = getTurnCount(updatedMsgs);
    const nextResponse: CoachingScenarioMessage | undefined = scenario[turnCount];

    setTimeout(async () => {
      const aiMessages: ChatMessage[] = [];

      if (crisis) {
        aiMessages.push({
          role: "ai",
          content: crisis.severity === "critical"
            ? "지금 많이 힘드시죠. 당신의 마음이 걱정됩니다. 혼자 감당하지 않아도 됩니다. 지금 바로 전문 상담사와 이야기해보시는 건 어떨까요? 자살예방상담전화 1393은 24시간 운영됩니다. 💜"
            : "많이 힘든 시간을 보내고 있군요. 이런 마음이 드는 건 자연스러운 거예요. 하지만 혹시 더 힘든 생각이 든다면, 전문가와 이야기해보는 것을 권합니다. 💜",
          timestamp: new Date().toISOString(),
        });
      } else if (nextResponse) {
        const msg: ChatMessage = { role: "ai", content: nextResponse.content, timestamp: new Date().toISOString() };
        if (nextResponse.tip) msg.tip = nextResponse.tip;
        aiMessages.push(msg);
      } else {
        aiMessages.push({
          role: "ai",
          content: "오늘 대화해 주셔서 감사해요. 😊 추가로 궁금한 점이 있으면 언제든 말씀해 주세요.",
          timestamp: new Date().toISOString(),
        });
      }

      const finalMsgs = [...updatedMsgs, ...aiMessages];
      setSessions((prev) => prev.map((s) => s.id === activeId ? { ...s, messages: finalMsgs } : s));
      setIsTyping(false);

      await supabase
        .from("coaching_sessions")
        .update({ messages: finalMsgs as unknown as Record<string, unknown>[], updated_at: new Date().toISOString() })
        .eq("id", activeId);
    }, 1500);
  };

  const handleNewConversation = async () => {
    if (!userId) return;
    const scenario = coachingScenarios["default"];
    const firstMsg: ChatMessage = { role: "ai", content: scenario[0].content, timestamp: new Date().toISOString() };

    const { data, error } = await supabase
      .from("coaching_sessions")
      .insert({
        user_id: userId,
        related_syndrome: null,
        messages: [firstMsg] as unknown as Record<string, unknown>[],
      })
      .select()
      .single();

    if (error) {
      toast({ title: "세션 생성 실패", variant: "destructive" });
      return;
    }

    const ns: DbSession = {
      id: data.id,
      related_syndrome: null,
      messages: [firstMsg],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
    setSessions((prev) => [ns, ...prev]);
    setActiveId(data.id);
    setShowCrisisBanner(false);
    setCrisisInfo(null);
    setSidebarOpen(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "오늘";
    if (diff === 1) return "어제";
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!userId) {
    return (
      <div className="space-y-6 animate-reveal-up">
        <h1 className="text-2xl font-bold">AI 코칭</h1>
        <div className="p-8 text-center">
          <p className="text-muted-foreground mb-4">로그인하면 AI 코칭을 시작할 수 있어요.</p>
          <Button onClick={() => navigate("/auth")} className="gradient-primary text-primary-foreground rounded-xl">로그인하기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] animate-fade-in -mx-4 md:-mx-8 -mt-4 md:-mt-8">
      {sidebarOpen && <div className="fixed inset-0 bg-foreground/20 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-50 md:z-auto top-0 left-0 h-full w-72 bg-card border-r border-border/50 flex flex-col transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} md:w-64 shrink-0`}>
        <div className="p-4 border-b border-border/50">
          <Button onClick={handleNewConversation} className="w-full rounded-xl gradient-primary text-primary-foreground gap-2 text-sm font-semibold">
            <Plus className="w-4 h-4" /> 새 대화 시작
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => { setActiveId(s.id); setShowCrisisBanner(false); setCrisisInfo(null); setSidebarOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors text-sm active:scale-[0.98] ${activeId === s.id ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted"}`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="truncate">{s.related_syndrome || "새 대화"}</span>
              </div>
              <div className="flex items-center gap-2 ml-6 mt-1">
                <span className="text-[10px] text-muted-foreground">{formatDate(s.updated_at)}</span>
                {s.related_syndrome && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/20 text-primary/70">{s.related_syndrome}</Badge>
                )}
              </div>
              {s.messages.length > 1 && (
                <p className="text-[10px] text-muted-foreground ml-6 mt-0.5 truncate">{s.messages[s.messages.length - 1].content.slice(0, 30)}...</p>
              )}
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">아직 대화가 없어요</p>
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3 shrink-0 bg-card/50">
          <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 md:hidden" onClick={() => setSidebarOpen(true)}>
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

        {active?.related_syndrome && (
          <div className="px-4 py-2 border-b border-border/50 flex gap-2 flex-wrap bg-card/30">
            <Badge variant="outline" className="text-[10px] font-medium bg-primary/5 text-primary border-primary/20">{active.related_syndrome}</Badge>
          </div>
        )}

        {/* Crisis banner */}
        {showCrisisBanner && (
          <div className="mx-4 mt-3 border rounded-xl p-4 animate-reveal-up" style={{ backgroundColor: "#FEE2E2", borderColor: "#EF4444" }}>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">❤️‍🩹</span>
              <div className="flex-1">
                <p className="text-sm font-bold mb-0.5" style={{ color: "#DC2626" }}>혼자 감당하지 않아도 됩니다.</p>
                <p className="text-xs mb-3" style={{ color: "#991B1B" }}>지금 바로 도움을 받을 수 있습니다.</p>
                <div className="flex gap-2 flex-wrap">
                  <a href="tel:1393" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg active:scale-95" style={{ backgroundColor: "#EF4444", color: "white" }}>
                    <Phone className="w-3.5 h-3.5" /> 📞 자살예방상담전화 1393
                  </a>
                  <button onClick={() => setCounselorModalOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border active:scale-95" style={{ borderColor: "#EF4444", color: "#DC2626", backgroundColor: "white" }}>
                    <MessageCircleHeart className="w-3.5 h-3.5" /> 💬 전문가 상담 연결
                  </button>
                </div>
              </div>
              <button onClick={() => setShowCrisisBanner(false)} style={{ color: "#EF4444" }}><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" ref={scrollRef}>
          {!active && (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">새 대화를 시작해보세요</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "ai" && (
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Brain className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "gradient-primary text-primary-foreground rounded-br-md shadow-sm" : "bg-card border border-primary/15 rounded-bl-md shadow-sm"}`}>
                  {msg.content.split("**").map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>)}
                </div>
              </div>
              {msg.tip && (
                <div className="ml-10 mt-2">
                  <div className="rounded-xl p-4 max-w-[80%] animate-fade-in shadow-sm border" style={{ backgroundColor: "#F5F3FF", borderColor: "hsl(263 70% 90%)" }}>
                    <p className="font-bold text-sm mb-1.5">{msg.tip.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{msg.tip.description}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 shadow-sm"><Brain className="w-4 h-4 text-primary-foreground" /></div>
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
              placeholder={active ? "메시지를 입력하세요..." : "새 대화를 시작해주세요"}
              className="rounded-xl border-border/50"
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
              disabled={isTyping || !active}
            />
            <Button size="icon" className="rounded-xl shrink-0 gradient-primary" onClick={handleSend} disabled={isTyping || !input.trim() || !active}>
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
            <DialogDescription className="text-sm text-muted-foreground">아래 연락처로 전문 상담을 받으실 수 있습니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="font-semibold text-sm">🧑‍⚕️ 김종환 심리코치</p>
              <p className="text-xs text-muted-foreground mt-1">수험생 심리 전문 | 20년 경력</p>
              <p className="text-xs text-muted-foreground mt-0.5">상담 문의: mindcoach@example.com</p>
            </div>
            <div className="space-y-2">
              <a href="tel:1393" className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.98]" style={{ backgroundColor: "#EF4444" }}>
                <Phone className="w-4 h-4" /> 자살예방상담전화 1393 (24시간)
              </a>
              <a href="tel:1577-0199" className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border text-sm font-semibold active:scale-[0.98]" style={{ borderColor: "#EF4444", color: "#DC2626" }}>
                <Phone className="w-4 h-4" /> 정신건강위기상담 1577-0199
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
