import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CHITO, CHITO_POSES, getChitoTransparentEmotionUrl } from "@/lib/character/chito";
import type { PrimaryEmotion } from "@/lib/emotion-agent-types";

interface MascotCardProps {
  userId: string;
  /** auth user 생성일 = 치토와의 첫 만남 */
  firstMetAt?: string;
}

interface MascotStats {
  recordCount: number;
  currentStreak: number;
  longestStreak: number;
  recentEmotion: PrimaryEmotion | null;
}

/* "내 마스코트"를 소유감 있는 카드로 — 함께한 날·기록 횟수·연속 기록·첫 만남
 * (점검 리포트 ① P2-7 · CHITO-STORY-SCENARIO.md) */
export default function MascotCard({ userId, firstMetAt }: MascotCardProps) {
  const [stats, setStats] = useState<MascotStats>({
    recordCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    recentEmotion: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [countRes, streakRes, recentRes] = await Promise.all([
        supabase
          .from("emotion_records")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("emotion_streaks")
          .select("current_streak, longest_streak")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("emotion_records")
          .select("primary_emotion")
          .eq("user_id", userId)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setStats({
        recordCount: countRes.count ?? 0,
        currentStreak: streakRes.data?.current_streak ?? 0,
        longestStreak: streakRes.data?.longest_streak ?? 0,
        recentEmotion: (recentRes.data?.primary_emotion as PrimaryEmotion) ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const daysTogether = firstMetAt
    ? Math.max(1, Math.floor((Date.now() - new Date(firstMetAt).getTime()) / 86400000) + 1)
    : null;
  const firstMetLabel = firstMetAt
    ? new Date(firstMetAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const chitoSrc = stats.recentEmotion
    ? getChitoTransparentEmotionUrl(stats.recentEmotion)
    : CHITO_POSES.waving;

  return (
    <Card className="p-5 rounded-2xl border-border/50 shadow-sm overflow-hidden">
      <h2 className="font-bold mb-3">내 마스코트</h2>
      <div className="flex items-center gap-4">
        <img
          src={chitoSrc}
          alt={CHITO.name}
          className="w-24 h-24 object-contain animate-chito-float shrink-0"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold">
            {CHITO.name}
            {daysTogether !== null && (
              <span className="ml-2 text-xs font-semibold text-primary">
                {daysTogether}일째 함께하는 중
              </span>
            )}
          </div>
          <div className="text-xs mt-1 text-muted-foreground leading-relaxed">{CHITO.copy}</div>
          {firstMetLabel && (
            <div className="text-[11px] mt-1.5 text-muted-foreground">
              🌱 첫 만남 — {firstMetLabel}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="rounded-xl bg-muted/50 py-3 text-center">
          <div className="text-lg font-extrabold gradient-text">{stats.recordCount}</div>
          <div className="text-[11px] text-muted-foreground font-medium">나눈 이야기</div>
        </div>
        <div className="rounded-xl bg-muted/50 py-3 text-center">
          <div className="text-lg font-extrabold gradient-text">{stats.currentStreak}일</div>
          <div className="text-[11px] text-muted-foreground font-medium">연속 기록</div>
        </div>
        <div className="rounded-xl bg-muted/50 py-3 text-center">
          <div className="text-lg font-extrabold gradient-text">{stats.longestStreak}일</div>
          <div className="text-[11px] text-muted-foreground font-medium">최장 기록</div>
        </div>
      </div>
    </Card>
  );
}
