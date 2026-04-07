/* ─── Inline Emotion Record Card for Coaching Chat ── */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { Check, Edit3, Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  emotionOptions,
  secondaryEmotionMap,
  bodyReactionOptions,
  type PrimaryEmotion,
} from "@/lib/emotion-agent-types";

export interface EmotionCardData {
  primaryEmotion: PrimaryEmotion;
  secondaryEmotions: string[];
  emotionScore: number;
  situation: string;
  bodyReactions: string[];
  aiComment: string;
}

interface Props {
  data: EmotionCardData;
  userId: string;
  sessionId: string;
  onSaved?: () => void;
}

export default function EmotionRecordCard({ data, userId, sessionId, onSaved }: Props) {
  const [cardData, setCardData] = useState<EmotionCardData>(data);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const emotionOpt = emotionOptions.find(e => e.key === cardData.primaryEmotion);
  const gradientFrom = emotionOpt?.gradientFrom || '#EDE9FE';
  const gradientTo = emotionOpt?.gradientTo || '#FCE7F3';
  const now = new Date();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('emotion_records')
        .insert({
          user_id: userId,
          primary_emotion: cardData.primaryEmotion,
          secondary_emotions: cardData.secondaryEmotions,
          emotion_score: cardData.emotionScore,
          situation: cardData.situation,
          body_reaction: cardData.bodyReactions,
          ai_comment: cardData.aiComment,
          source: 'coaching_chat',
          source_conversation_id: sessionId,
          conversation_log: [],
          recorded_at: new Date().toISOString(),
        } as any);

      if (error) throw error;

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      const { data: streakData } = await supabase
        .from('emotion_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (streakData) {
        const lastDate = streakData.last_record_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = streakData.current_streak;
        if (lastDate === yesterdayStr) newStreak += 1;
        else if (lastDate !== today) newStreak = 1;

        await supabase
          .from('emotion_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, streakData.longest_streak),
            last_record_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq('id', streakData.id);
      } else {
        await supabase.from('emotion_streaks').insert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_record_date: today,
        });
      }

      setSaved(true);
      toast({ title: "✅ 감정기록 저장 완료!", description: "감정 트래킹에서 확인할 수 있어요." });
      onSaved?.();
    } catch (err: any) {
      toast({ title: "저장 실패", description: "다시 시도해 주세요.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div
        className="rounded-2xl p-4 mt-2 border shadow-sm animate-fade-in"
        style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`, borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Check className="w-4 h-4 text-green-600" />
          <span>감정기록이 저장되었어요!</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">감정 트래킹 페이지에서 확인할 수 있어요.</p>
      </div>
    );
  }

  if (editing) {
    return (
      <div
        className="rounded-2xl p-4 mt-2 border shadow-sm space-y-3"
        style={{ background: `linear-gradient(135deg, ${gradientFrom}80, ${gradientTo}80)`, borderColor: 'hsl(var(--border))' }}
      >
        <p className="text-xs font-bold">✏️ 감정기록 수정</p>

        {/* Primary emotion */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">주요 감정</p>
          <div className="flex flex-wrap gap-1.5">
            {emotionOptions.map(e => (
              <button
                key={e.key}
                onClick={() => setCardData(d => ({ ...d, primaryEmotion: e.key, secondaryEmotions: [] }))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${cardData.primaryEmotion === e.key ? 'bg-primary/10 border-primary text-primary font-semibold scale-105' : 'border-border/50 text-muted-foreground'}`}
              >
                {e.emoji} {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary emotions */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">세부 감정</p>
          <div className="flex flex-wrap gap-1.5">
            {secondaryEmotionMap[cardData.primaryEmotion].map(s => (
              <button
                key={s.key}
                onClick={() => {
                  setCardData(d => ({
                    ...d,
                    secondaryEmotions: d.secondaryEmotions.includes(s.label)
                      ? d.secondaryEmotions.filter(x => x !== s.label)
                      : [...d.secondaryEmotions, s.label],
                  }));
                }}
                className={`text-xs px-2 py-0.5 rounded-full border transition-all ${cardData.secondaryEmotions.includes(s.label) ? 'bg-primary/10 border-primary text-primary' : 'border-border/50 text-muted-foreground'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Situation */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">상황</p>
          <Input
            value={cardData.situation}
            onChange={e => setCardData(d => ({ ...d, situation: e.target.value }))}
            className="text-xs h-8 rounded-lg"
          />
        </div>

        {/* Body reactions */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">신체 반응</p>
          <div className="flex flex-wrap gap-1.5">
            {bodyReactionOptions.map(b => (
              <button
                key={b.key}
                onClick={() => {
                  if (b.key === 'none') {
                    setCardData(d => ({ ...d, bodyReactions: [] }));
                    return;
                  }
                  setCardData(d => ({
                    ...d,
                    bodyReactions: d.bodyReactions.includes(b.key)
                      ? d.bodyReactions.filter(x => x !== b.key)
                      : [...d.bodyReactions.filter(x => x !== 'none'), b.key],
                  }));
                }}
                className={`text-xs px-2 py-0.5 rounded-full border transition-all ${cardData.bodyReactions.includes(b.key) ? 'bg-primary/10 border-primary text-primary' : 'border-border/50 text-muted-foreground'}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Score slider */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">감정 점수: {cardData.emotionScore}/5</p>
          <Slider
            value={[cardData.emotionScore]}
            min={1}
            max={5}
            step={1}
            onValueChange={([v]) => setCardData(d => ({ ...d, emotionScore: v }))}
            className="w-full"
          />
        </div>

        <Button size="sm" className="w-full rounded-xl text-xs" onClick={() => setEditing(false)}>
          수정 완료
        </Button>
      </div>
    );
  }

  // Preview mode
  const bodyLabels = cardData.bodyReactions.map(
    k => bodyReactionOptions.find(b => b.key === k)?.label || k
  );

  return (
    <div
      className="rounded-2xl p-4 mt-2 border shadow-sm animate-fade-in"
      style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`, borderColor: 'hsl(var(--border))' }}
    >
      <p className="text-xs font-bold mb-2">📝 감정기록 카드</p>
      <div className="space-y-1.5 text-xs">
        <p>📅 {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일 {now.getHours() > 12 ? '오후' : '오전'} {now.getHours() % 12 || 12}:{String(now.getMinutes()).padStart(2, '0')}</p>
        <p>💜 주요 감정: {emotionOpt?.emoji} {emotionOpt?.label}</p>
        {cardData.secondaryEmotions.length > 0 && (
          <p>🏷️ 세부 감정: {cardData.secondaryEmotions.join(', ')}</p>
        )}
        {cardData.situation && <p>📖 상황: {cardData.situation}</p>}
        {bodyLabels.length > 0 && <p>🫀 신체: {bodyLabels.join(', ')}</p>}
        <p>💡 감정 점수: {cardData.emotionScore}/5</p>
      </div>
      {cardData.aiComment && (
        <p className="text-[10px] text-muted-foreground mt-2 italic">💡 {cardData.aiComment}</p>
      )}
      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-xl text-xs h-8"
          onClick={() => setEditing(true)}
        >
          <Edit3 className="w-3 h-3 mr-1" /> 수정하기
        </Button>
        <Button
          size="sm"
          className="flex-1 rounded-xl text-xs h-8 gradient-primary text-primary-foreground"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
          감정기록 저장하기
        </Button>
      </div>
    </div>
  );
}
