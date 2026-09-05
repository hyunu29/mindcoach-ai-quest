/* ─── Emotion Agent Chat Component ─────────────────── */
import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Check, SkipForward, Pencil, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { detectCrisisSignal } from "@/data/seed-data";
import { CHITO_EMBLEM_URL } from "@/lib/character/chito";
import {
  emotionOptions,
  secondaryEmotionMap,
  bodyReactionOptions,
  type PrimaryEmotion,
  type AgentMessage,
  type EmotionJournalData,
  type ConversationStep,
} from "@/lib/emotion-agent-types";
import {
  turn1Responses,
  turn2Responses,
  turn3Responses,
  aiComments,
  pickRandom,
} from "@/lib/emotion-agent-templates";

interface EmotionAgentChatProps {
  userId: string;
  onRecordSaved: () => void;
  todayRecord: any | null;
}

export default function EmotionAgentChat({ userId, onRecordSaved, todayRecord }: EmotionAgentChatProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<ConversationStep>('idle');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState<PrimaryEmotion | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string[]>([]);
  const [situation, setSituation] = useState("");
  const [bodyReactions, setBodyReactions] = useState<string[]>([]);
  const [journalData, setJournalData] = useState<EmotionJournalData | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [showCrisisBanner, setShowCrisisBanner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSituation, setEditSituation] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  }, []);

  const addMessage = useCallback((msg: Omit<AgentMessage, 'id' | 'timestamp'>) => {
    const newMsg: AgentMessage = { ...msg, id: crypto.randomUUID(), timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  }, []);

  const addAgentDelayed = useCallback((content: string, extras?: Partial<AgentMessage>) => {
    setTimeout(() => {
      addMessage({ role: 'agent', content, ...extras });
      scrollToBottom();
    }, 600);
  }, [addMessage, scrollToBottom]);

  // Start conversation
  const startConversation = useCallback(() => {
    setStep('emotion');
    setMessages([]);
    setSelectedEmotion(null);
    setSelectedSecondary([]);
    setSituation("");
    setBodyReactions([]);
    setJournalData(null);
    setSavedRecordId(null);
    setIsEditing(false);

    addMessage({
      role: 'agent',
      content: "안녕! 오늘 하루를 돌아보면, 지금 마음이 어떤 느낌이야?",
      chips: emotionOptions.map(e => ({ key: e.key, label: e.label, emoji: e.emoji })),
    });
    scrollToBottom();
  }, [addMessage, scrollToBottom]);

  // Handle emotion chip selection
  const handleEmotionSelect = useCallback((emotionKey: string) => {
    const emotion = emotionKey as PrimaryEmotion;
    const opt = emotionOptions.find(e => e.key === emotion);
    if (!opt) return;

    setSelectedEmotion(emotion);
    addMessage({ role: 'user', content: `${opt.emoji} ${opt.label}` });
    setStep('situation');

    addAgentDelayed(pickRandom(turn1Responses[emotion]));
  }, [addMessage, addAgentDelayed]);

  // Handle text input submit
  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");

    // Crisis detection
    const crisis = detectCrisisSignal(text);
    if (crisis) {
      setShowCrisisBanner(true);
    }

    addMessage({ role: 'user', content: text });

    if (step === 'situation') {
      setSituation(text);
      setStep('depth');
      addAgentDelayed(
        pickRandom(turn2Responses[selectedEmotion!]),
        {
          chips: secondaryEmotionMap[selectedEmotion!].map(s => ({ key: s.key, label: s.label })),
        }
      );
    } else if (step === 'depth') {
      // Free text for depth – treat as secondary emotion description
      setSelectedSecondary([text]);
      setStep('body');
      addAgentDelayed(
        pickRandom(turn3Responses[selectedEmotion!]),
        {
          chips: bodyReactionOptions.map(b => ({ key: b.key, label: b.label })),
          skipButton: "괜찮아, 넘어갈래",
        }
      );
    }
    scrollToBottom();
  }, [input, step, selectedEmotion, addMessage, addAgentDelayed, scrollToBottom]);

  // Handle secondary emotion chips
  const handleSecondarySelect = useCallback((keys: string[]) => {
    const labels = keys.map(k => {
      const found = secondaryEmotionMap[selectedEmotion!]?.find(s => s.key === k);
      return found?.label || k;
    });
    setSelectedSecondary(labels);
    addMessage({ role: 'user', content: labels.join(', ') });
    setStep('body');
    addAgentDelayed(
      pickRandom(turn3Responses[selectedEmotion!]),
      {
        chips: bodyReactionOptions.map(b => ({ key: b.key, label: b.label })),
        skipButton: "괜찮아, 넘어갈래",
      }
    );
    scrollToBottom();
  }, [selectedEmotion, addMessage, addAgentDelayed, scrollToBottom]);

  // 대화 종료 시 자동 저장 — "저장 결심" 단계를 없앤다 (수동 저장 버튼 제거)
  const saveRecord = useCallback(async (journal: EmotionJournalData) => {
    if (saving) return;
    setSaving(true);
    try {
      // Save emotion_records
      const { data: inserted, error } = await supabase.from('emotion_records').insert({
        user_id: userId,
        primary_emotion: journal.primaryEmotion,
        secondary_emotions: journal.secondaryEmotions,
        emotion_score: journal.emotionScore,
        situation: journal.situation,
        body_reaction: journal.bodyReactions,
        ai_comment: journal.aiComment,
        conversation_log: messages.map(m => ({ role: m.role, content: m.content })),
      }).select('id').single();
      if (error) throw error;

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      const { data: streak } = await supabase
        .from('emotion_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (streak) {
        const lastDate = streak.last_record_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = 1;
        if (lastDate === yesterdayStr) {
          newStreak = (streak.current_streak || 0) + 1;
        } else if (lastDate === today) {
          newStreak = streak.current_streak || 1;
        }

        await supabase.from('emotion_streaks').update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak || 0),
          last_record_date: today,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId);
      } else {
        await supabase.from('emotion_streaks').insert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_record_date: today,
        });
      }

      setSavedRecordId(inserted?.id ?? null);
      toast({ title: "기록 완료! 🎉", description: "오늘의 감정을 자동으로 저장했어요." });
      onRecordSaved();
    } catch (err) {
      console.error(err);
      toast({ title: "저장 실패", description: "네트워크를 확인하고 다시 시도해주세요.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [saving, userId, messages, onRecordSaved]);

  // Generate summary card
  const generateSummary = useCallback((bodyRxns: string[]) => {
    const now = new Date();
    const opt = emotionOptions.find(e => e.key === selectedEmotion);
    const comment = pickRandom(aiComments[selectedEmotion!]);

    const journal: EmotionJournalData = {
      date: now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
      time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      primaryEmotion: selectedEmotion!,
      primaryEmotionLabel: opt?.label || '',
      secondaryEmotions: selectedSecondary,
      situation,
      bodyReactions: bodyRxns,
      aiComment: comment,
      emotionScore: opt?.score || 3,
    };
    setJournalData(journal);
    setStep('summary');

    setTimeout(() => {
      addMessage({
        role: 'agent',
        content: "오늘 이렇게 마음을 들여다본 것만으로도 대단한 거야. 오늘의 기록을 정리해서 저장해뒀어!",
        isJournalCard: true,
        journalData: journal,
      });
      scrollToBottom();
      void saveRecord(journal);
    }, 600);
  }, [selectedEmotion, selectedSecondary, situation, addMessage, scrollToBottom, saveRecord]);

  // Handle body reaction chips
  const handleBodySelect = useCallback((keys: string[]) => {
    const labels = keys.filter(k => k !== 'none').map(k => {
      const found = bodyReactionOptions.find(b => b.key === k);
      return found?.label || k;
    });
    setBodyReactions(labels);
    if (keys.includes('none')) {
      addMessage({ role: 'user', content: '없었어' });
    } else {
      addMessage({ role: 'user', content: labels.join(', ') });
    }
    generateSummary(labels);
    scrollToBottom();
  }, [addMessage, scrollToBottom, generateSummary]);

  // Skip body reaction
  const handleSkipBody = useCallback(() => {
    addMessage({ role: 'user', content: '넘어갈게!' });
    generateSummary([]);
    scrollToBottom();
  }, [addMessage, scrollToBottom, generateSummary]);

  // Crisis banner
  const CrisisBanner = () => (
    showCrisisBanner ? (
      <div className="mx-2 mb-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
        <p className="text-sm font-semibold text-destructive">⚠️ 힘든 상황이라면 전문가의 도움을 받을 수 있어요</p>
        <p className="text-xs text-muted-foreground mt-1">자살예방상담전화 <strong>1393</strong> (24시간)</p>
        <Button size="sm" variant="destructive" className="mt-2 text-xs" onClick={() => window.open('tel:1393')}>
          📞 상담 전화 연결
        </Button>
      </div>
    ) : null
  );

  // Multi-select chip handler for depth/body
  const [tempChipSelections, setTempChipSelections] = useState<string[]>([]);

  const renderChips = (msg: AgentMessage) => {
    if (!msg.chips || step === 'saved' || step === 'summary') return null;
    const lastAgentMsg = [...messages].reverse().find(m => m.role === 'agent');
    if (lastAgentMsg?.id !== msg.id) return null;

    if (step === 'emotion') {
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          {msg.chips.map(c => (
            <button
              key={c.key}
              onClick={() => handleEmotionSelect(c.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-background border border-border hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-95 text-sm"
            >
              <span className="text-lg">{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      );
    }

    if (step === 'depth') {
      return (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {msg.chips.map(c => (
              <button
                key={c.key}
                onClick={() => {
                  setTempChipSelections(prev =>
                    prev.includes(c.key) ? prev.filter(k => k !== c.key) : [...prev, c.key]
                  );
                }}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all active:scale-95 ${
                  tempChipSelections.includes(c.key)
                    ? 'bg-primary/15 border-primary/40 text-primary font-medium scale-105'
                    : 'bg-background border-border hover:border-primary/30'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {tempChipSelections.length > 0 && (
            <Button
              size="sm"
              variant="hero"
              className="rounded-full text-xs"
              onClick={() => {
                handleSecondarySelect(tempChipSelections);
                setTempChipSelections([]);
              }}
            >
              선택 완료
            </Button>
          )}
        </div>
      );
    }

    if (step === 'body') {
      return (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {msg.chips.map(c => (
              <button
                key={c.key}
                onClick={() => {
                  if (c.key === 'none') {
                    handleBodySelect(['none']);
                    return;
                  }
                  setTempChipSelections(prev =>
                    prev.includes(c.key) ? prev.filter(k => k !== c.key) : [...prev.filter(k => k !== 'none'), c.key]
                  );
                }}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all active:scale-95 ${
                  tempChipSelections.includes(c.key)
                    ? 'bg-primary/15 border-primary/40 text-primary font-medium scale-105'
                    : 'bg-background border-border hover:border-primary/30'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {tempChipSelections.length > 0 && (
              <Button
                size="sm"
                variant="hero"
                className="rounded-full text-xs"
                onClick={() => {
                  handleBodySelect(tempChipSelections);
                  setTempChipSelections([]);
                }}
              >
                선택 완료
              </Button>
            )}
            {msg.skipButton && (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full text-xs text-muted-foreground"
                onClick={handleSkipBody}
              >
                <SkipForward className="w-3 h-3 mr-1" />
                {msg.skipButton}
              </Button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Journal card renderer
  const renderJournalCard = (journal: EmotionJournalData) => {
    const opt = emotionOptions.find(e => e.key === journal.primaryEmotion);
    const isNegative = ['sad', 'angry', 'anxious'].includes(journal.primaryEmotion);
    const isPositive = ['happy', 'calm'].includes(journal.primaryEmotion);

    return (
      <div
        className="rounded-2xl p-4 mt-2 border border-border/30 shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${opt?.gradientFrom || '#F3F4F6'}, ${opt?.gradientTo || '#EDE9FE'})`,
        }}
      >
        <div className="space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">📅 {journal.date} {journal.time}</p>
          <p>💜 주요 감정: {opt?.emoji} {journal.primaryEmotionLabel}
            {journal.secondaryEmotions.length > 0 && ` → ${journal.secondaryEmotions.join(', ')}`}
          </p>
          {journal.situation && (
            isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={editSituation}
                  onChange={e => setEditSituation(e.target.value)}
                  className="flex-1 text-xs rounded-lg bg-white/70"
                />
                <Button size="sm" variant="outline" className="text-xs rounded-lg" onClick={() => {
                  setSituation(editSituation);
                  setJournalData(prev => prev ? { ...prev, situation: editSituation } : prev);
                  setMessages(prev => prev.map(m =>
                    m.isJournalCard && m.journalData
                      ? { ...m, journalData: { ...m.journalData, situation: editSituation } }
                      : m
                  ));
                  // 자동 저장된 레코드에도 반영
                  if (savedRecordId) {
                    void supabase.from('emotion_records')
                      .update({ situation: editSituation })
                      .eq('id', savedRecordId);
                  }
                  setIsEditing(false);
                }}>확인</Button>
              </div>
            ) : (
              <p>📝 상황: {journal.situation}</p>
            )
          )}
          {journal.bodyReactions.length > 0 && (
            <p>🫀 신체 반응: {journal.bodyReactions.join(', ')}</p>
          )}
          <div className={`mt-2 p-2.5 rounded-xl ${isNegative ? 'bg-violet-50/80' : isPositive ? 'bg-green-50/80' : 'bg-gray-50/80'}`}>
            <p className="text-xs leading-relaxed">💡 {journal.aiComment}</p>
          </div>
        </div>

        {step === 'summary' && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              {saving ? (
                <span className="text-muted-foreground">저장 중...</span>
              ) : savedRecordId ? (
                <><Check className="w-3.5 h-3.5" /> 자동으로 저장됐어요</>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl flex-1"
                onClick={() => {
                  setIsEditing(true);
                  setEditSituation(journal.situation);
                }}
              >
                <Pencil className="w-3.5 h-3.5 mr-1" /> 수정
              </Button>
              <Button
                size="sm"
                variant="hero"
                className="rounded-xl flex-1"
                onClick={() => navigate('/coaching')}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" /> 치토랑 더 얘기하기
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-muted-foreground"
                onClick={() => setStep('idle')}
              >
                끝내기
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
        <h2 className="text-lg font-bold mt-1">오늘 하루는 어땠나요?</h2>
      </div>

      {/* Idle state */}
      {step === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center overflow-hidden">
            <img src={CHITO_EMBLEM_URL} alt="치토" className="w-20 h-20 object-contain" />
          </div>
          <p className="text-sm text-muted-foreground text-center">치토가 오늘의 감정을 기록할 수 있도록 도와줄게요</p>

          {/* 오늘 기록 요약 — "처음인 척" 방지 */}
          {todayRecord && (
            <div className="w-full max-w-xs rounded-2xl bg-muted/50 border border-border/50 p-4 text-center animate-pop-in">
              <p className="text-xs text-muted-foreground mb-1">✅ 오늘의 기록</p>
              <p className="text-sm font-semibold">
                {emotionOptions.find(e => e.key === todayRecord.primary_emotion)?.emoji}{' '}
                {emotionOptions.find(e => e.key === todayRecord.primary_emotion)?.label ?? ''}
              </p>
              {todayRecord.situation && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">"{todayRecord.situation}"</p>
              )}
            </div>
          )}

          <Button variant="hero" size="lg" className="rounded-xl w-full max-w-xs" onClick={startConversation}>
            {todayRecord ? "한 번 더 기록하기" : "감정 기록 시작하기"}
          </Button>
        </div>
      )}

      {/* Chat area */}
      {step !== 'idle' && (
        <>
          <CrisisBanner />
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'flex gap-2'}`}>
                  {msg.role === 'agent' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center shrink-0 mt-1 overflow-hidden">
                      <img src={CHITO_EMBLEM_URL} alt="치토" className="w-7 h-7 object-contain" />
                    </div>
                  )}
                  <div>
                    {msg.role === 'agent' && !msg.isJournalCard && (
                      <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5">
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    )}
                    {msg.role === 'agent' && msg.isJournalCard && (
                      <div>
                        <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 mb-2">
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                        {msg.journalData && renderJournalCard(msg.journalData)}
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5">
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    )}
                    {msg.role === 'agent' && renderChips(msg)}
                  </div>
                </div>
              </div>
            ))}

          </div>

          {/* Input area */}
          {(step === 'situation' || step === 'depth') && (
            <div className="px-3 pb-3 pt-1 border-t border-border/50">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={step === 'situation' ? "오늘 있었던 일을 알려줘..." : "느낌을 자유롭게 적어봐..."}
                  className="rounded-xl"
                />
                <Button size="icon" variant="hero" className="rounded-xl shrink-0" onClick={handleSend} disabled={!input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
