import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Send, Plus, MessageSquare, Phone, Menu, X, Brain, MessageCircleHeart, Loader2, CheckCircle2, ClipboardCheck, Sparkles,
} from "lucide-react";
import { detectCrisisSignal, syndromes } from "@/data/seed-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { streamCoachingChat } from "@/lib/coaching-stream";
import type { ChatMessage, DbSession } from "@/lib/coaching-types";
import { runAgentActions, type AgentDecision } from "@/services/agentEngine";
import { getRecentEmotions, buildEmotionSummary } from "@/services/agentActions";
import { fetchCurrentCredits, consumeAiCredit, type CreditState } from "@/lib/credits";

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

  const [testResultSummaryCtx, setTestResultSummaryCtx] = useState<string | null>(null);
  const [emotionSummaryCtx, setEmotionSummaryCtx] = useState<string | null>(null);

  // Track whether emotion was already saved in this session
  const [emotionSavedInSession, setEmotionSavedInSession] = useState<Record<string, boolean>>({});

  const [credits, setCredits] = useState<CreditState>({ creditId: null, remaining: 0, granted: 0 });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const refreshCredits = useCallback(async (uid: string) => {
    const c = await fetchCurrentCredits(uid);
    if (c) setCredits(c);
  }, []);

  const active = sessions.find((s) => s.id === activeId);
  const messages = active?.messages || [];

  const getSyndromeContext = (syndromeName: string | null) => {
    if (!syndromeName) return null;
    const syndrome = syndromes.find((s) => s.name === syndromeName);
    if (!syndrome) return null;
    return {
      name: syndrome.name,
      description: syndrome.description,
      causes: syndrome.causes,
      symptoms: syndrome.symptoms,
      solutions: syndrome.solutions,
    };
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      await refreshCredits(user.id);

      const { data: testResults } = await supabase
        .from("test_results")
        .select("*, tests(name, related_syndrome)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (testResults && testResults.length > 0) {
        const summary = testResults.map((r: any) =>
          `- ${r.tests?.name || r.test_id}: 총점 ${r.total_score}/100 (${r.risk_label}), 관련 증후군: ${r.matched_syndrome || "없음"}, 검사일: ${new Date(r.created_at).toLocaleDateString("ko-KR")}`
        ).join("\n");
        setTestResultSummaryCtx(summary);
      }

      // Fetch recent emotions for context
      try {
        const recentEmotions = await getRecentEmotions(user.id);
        if (recentEmotions.length > 0) {
          setEmotionSummaryCtx(buildEmotionSummary(recentEmotions));
        }
      } catch (e) {
        console.error("Failed to fetch recent emotions:", e);
      }

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

      const syndrome = searchParams.get("syndrome");
      const resultId = searchParams.get("resultId");
      if (syndrome) {
        const firstMsg: ChatMessage = { role: "ai", content: "", timestamp: new Date().toISOString() };

        const { data: newSession, error: insertError } = await supabase
          .from("coaching_sessions")
          .insert({ user_id: user.id, related_syndrome: syndrome, related_test_result_id: resultId || null, messages: [firstMsg] as any } as any)
          .select()
          .single();

        if (!insertError && newSession) {
          const ns: DbSession = { id: newSession.id, related_syndrome: newSession.related_syndrome, messages: [firstMsg], created_at: newSession.created_at, updated_at: newSession.updated_at };
          setSessions((prev) => [ns, ...prev]);
          setActiveId(newSession.id);
          generateFirstMessage(newSession.id, syndrome, []);
        }
      } else if (loaded.length > 0) {
        setActiveId(loaded[0].id);
      }

      setLoading(false);
    };
    init();
  }, []);

  const generateFirstMessage = async (sessionId: string, syndrome: string | null, existingMsgs: ChatMessage[]) => {
    if (!userId) return;
    const consume = await consumeAiCredit(1);
    if (!consume.success) {
      setShowUpgradeModal(true);
      toast({ title: "크레딧 부족으로 자동 인사를 생략했습니다", variant: "destructive" });
      return;
    }
    const usedCreditId = consume.creditId;
    setCredits((prev) => ({ ...prev, creditId: usedCreditId ?? prev.creditId, remaining: consume.remaining }));
    setIsTyping(true);
    let aiContent = "";
    const syndromeCtx = getSyndromeContext(syndrome);

    await streamCoachingChat({
      messages: existingMsgs,
      syndromeContext: syndromeCtx,
      testResultSummary: testResultSummaryCtx,
      emotionSummary: emotionSummaryCtx,
      onDelta: (chunk) => {
        aiContent += chunk;
        const updatedMsg: ChatMessage = { role: "ai", content: aiContent, timestamp: new Date().toISOString() };
        setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, messages: [updatedMsg] } : s));
      },
      onDone: async () => {
        setIsTyping(false);
        const finalMsg: ChatMessage = { role: "ai", content: aiContent, timestamp: new Date().toISOString() };
        await supabase.from("coaching_sessions").update({ messages: [finalMsg] as any, updated_at: new Date().toISOString() }).eq("id", sessionId);
        await supabase.from("ai_usage_log").insert({
          user_id: userId,
          session_id: sessionId,
          credit_id: usedCreditId,
          cost: 1,
          tokens_in: null,
          tokens_out: null,
          model: "gemini-3-flash",
        });
        await refreshCredits(userId);
      },
      onError: (err) => {
        setIsTyping(false);
        // TODO: refund credit on stream error
        const fallbackMsg: ChatMessage = { role: "ai", content: "안녕하세요! 마인드코치 AI입니다. 😊 어떤 이야기든 편하게 말씀해 주세요.", timestamp: new Date().toISOString() };
        setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, messages: [fallbackMsg] } : s));
        toast({ title: "AI 연결 오류", description: err, variant: "destructive" });
      },
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping || !active || !userId || !activeId) return;

    if (credits.remaining <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    const consume = await consumeAiCredit(1);
    if (!consume.success) {
      setShowUpgradeModal(true);
      return;
    }
    const usedCreditId = consume.creditId;
    setCredits((prev) => ({ ...prev, creditId: usedCreditId ?? prev.creditId, remaining: consume.remaining }));

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

    await supabase.from("coaching_sessions").update({ messages: updatedMsgs as any, updated_at: new Date().toISOString() }).eq("id", activeId);

    // Run agent actions (emotion save, test recommend) — skip if crisis
    let agentResult: AgentDecision | null = null;
    if (!crisis) {
      try {
        agentResult = await runAgentActions(
          text,
          updatedMsgs,
          userId,
          !!emotionSavedInSession[activeId],
        );
        if (agentResult.saveEmotion && agentResult.savedEmotionId) {
          setEmotionSavedInSession(prev => ({ ...prev, [activeId]: true }));
        }
      } catch (err) {
        console.error("Agent action error:", err);
      }
    }

    // Stream AI response
    let aiContent = "";
    const syndromeCtx = getSyndromeContext(active.related_syndrome);
    let combinedTestSummary = testResultSummaryCtx;
    if (crisis) {
      const crisisNote = `⚠️ 위험 신호 감지: ${crisis.type} (심각도: ${crisis.severity}). 사용자의 안전을 최우선으로 응답해주세요.`;
      combinedTestSummary = combinedTestSummary ? `${crisisNote}\n\n${combinedTestSummary}` : crisisNote;
    }

    const currentSessionId = activeId;

    await streamCoachingChat({
      messages: updatedMsgs,
      syndromeContext: syndromeCtx,
      testResultSummary: combinedTestSummary,
      emotionSummary: emotionSummaryCtx,
      onDelta: (chunk) => {
        aiContent += chunk;
        const aiMsg: ChatMessage = { role: "ai", content: aiContent, timestamp: new Date().toISOString() };
        setSessions((prev) => prev.map((s) => s.id === currentSessionId ? { ...s, messages: [...updatedMsgs, aiMsg] } : s));
      },
      onDone: async () => {
        setIsTyping(false);

        // Build AI message with agent action metadata
        const aiMsg: ChatMessage = {
          role: "ai",
          content: aiContent,
          timestamp: new Date().toISOString(),
        };

        // Attach agent action results as metadata
        if (agentResult?.saveEmotion && agentResult.savedEmotionId) {
          (aiMsg as any).agentAction = {
            type: "emotion_saved",
            emotionId: agentResult.savedEmotionId,
            emoji: agentResult.emotionData?.emoji,
          };
        }
        if (agentResult?.recommendTests && agentResult.recommendedTests) {
          (aiMsg as any).recommendedTests = agentResult.recommendedTests;
        }

        const finalMsgs = [...updatedMsgs, aiMsg];
        setSessions((prev) => prev.map((s) => s.id === currentSessionId ? { ...s, messages: finalMsgs } : s));
        await supabase.from("coaching_sessions").update({ messages: finalMsgs as any, updated_at: new Date().toISOString() }).eq("id", currentSessionId);
        await supabase.from("ai_usage_log").insert({
          user_id: userId,
          session_id: currentSessionId,
          credit_id: usedCreditId,
          cost: 1,
          tokens_in: null,
          tokens_out: null,
          model: "gemini-3-flash",
        });
        await refreshCredits(userId);
      },
      onError: (err) => {
        setIsTyping(false);
        // TODO: refund credit on stream error
        const fallbackMsg: ChatMessage = { role: "ai", content: "죄송합니다, 일시적으로 응답을 생성하지 못했어요. 다시 시도해 주세요. 🙏", timestamp: new Date().toISOString() };
        const finalMsgs = [...updatedMsgs, fallbackMsg];
        setSessions((prev) => prev.map((s) => s.id === currentSessionId ? { ...s, messages: finalMsgs } : s));
        toast({ title: "AI 응답 오류", description: err, variant: "destructive" });
      },
    });
  };

  const handleNewConversation = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("coaching_sessions")
      .insert({ user_id: userId, related_syndrome: null, messages: [] as any } as any)
      .select()
      .single();

    if (error) { toast({ title: "세션 생성 실패", variant: "destructive" }); return; }

    const ns: DbSession = { id: data.id, related_syndrome: null, messages: [], created_at: data.created_at, updated_at: data.updated_at };
    setSessions((prev) => [ns, ...prev]);
    setActiveId(data.id);
    setShowCrisisBanner(false);
    setCrisisInfo(null);
    setSidebarOpen(false);
    generateFirstMessage(data.id, null, []);
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
          {sessions.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">아직 대화가 없어요</p>}
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
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className={`ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
              credits.remaining === 0
                ? "bg-red-100 text-red-700 border-red-200"
                : credits.remaining <= 5
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-primary/10 text-primary border-primary/20"
            }`}
            title="AI 코칭 크레딧"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 크레딧 {credits.remaining} / {credits.granted}</span>
          </button>
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

              {/* Tip card */}
              {msg.tip && (
                <div className="ml-10 mt-2">
                  <div className="rounded-xl p-4 max-w-[80%] animate-fade-in shadow-sm border" style={{ backgroundColor: "#F5F3FF", borderColor: "hsl(263 70% 90%)" }}>
                    <p className="font-bold text-sm mb-1.5">{msg.tip.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{msg.tip.description}</p>
                  </div>
                </div>
              )}

              {/* Agent action: emotion saved notification */}
              {(msg as any).agentAction?.type === "emotion_saved" && (
                <div className="ml-10 mt-2 max-w-[80%]">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium animate-fade-in"
                    style={{ backgroundColor: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✅ 감정 트래킹에 기록되었습니다</span>
                    <button
                      onClick={() => navigate("/emotion")}
                      className="ml-auto underline text-xs font-semibold hover:opacity-80"
                    >
                      확인하기 →
                    </button>
                  </div>
                </div>
              )}

              {/* Agent action: test recommendation */}
              {(msg as any).recommendedTests && (msg as any).recommendedTests.length > 0 && (
                <div className="ml-10 mt-2 max-w-[80%] space-y-1.5">
                  {(msg as any).recommendedTests.slice(0, 2).map((test: any) => (
                    <button
                      key={test.id}
                      onClick={() => navigate(`/tests/${test.id}`)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium border border-primary/20 hover:bg-primary/5 transition-colors text-left animate-fade-in"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-primary">📝 {test.name} 바로가기 →</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Legacy emotion card (from previous implementation) */}
              {msg.emotionCard && userId && activeId && (
                <div className="ml-10 mt-2 max-w-[80%]">
                  <EmotionRecordCardLegacy data={msg.emotionCard} />
                </div>
              )}
            </div>
          ))}
          {isTyping && messages[messages.length - 1]?.role !== "ai" && (
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

      {/* Upgrade modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent
          className="rounded-2xl max-w-sm"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-lg">크레딧이 부족해요</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              AI 코칭 크레딧을 모두 사용했습니다. Pro 플랜으로 업그레이드하면 매월 200 크레딧을 받을 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              className="rounded-xl gradient-primary text-primary-foreground"
              onClick={() => {
                setShowUpgradeModal(false);
                toast({ title: "곧 출시 예정", description: "Pro 플랜은 준비 중입니다." });
              }}
            >
              Pro 플랜 보기
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowUpgradeModal(false)}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Simple legacy card for backward compat with old emotionCard messages */
function EmotionRecordCardLegacy({ data }: { data: any }) {
  return (
    <div className="rounded-xl p-3 text-xs border border-primary/15 bg-primary/5 animate-fade-in">
      <p className="font-semibold mb-1">📝 감정 감지</p>
      <p>💜 {data.primaryEmotion} {data.secondaryEmotions?.length > 0 && `→ ${data.secondaryEmotions.join(', ')}`}</p>
      {data.bodyReactions?.length > 0 && <p>🫀 {data.bodyReactions.join(', ')}</p>}
    </div>
  );
}
