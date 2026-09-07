import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmotionHistory from "@/components/emotion/EmotionHistory";
import { CHITO_POSES } from "@/lib/character/chito";

/* 2026-09-07 홈 개편: 감정 "기록"은 홈(치토 스테이지)으로 일원화.
 * 이 페이지는 기록·리포트 열람 전용. */
export default function EmotionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="space-y-6 animate-reveal-up">
        <h1 className="text-2xl font-bold">감정 리포트</h1>
        <Card className="p-8 rounded-2xl text-center">
          <p className="text-muted-foreground mb-4">로그인하면 감정 기록과 리포트를 볼 수 있어요.</p>
          <Button onClick={() => navigate("/auth")} className="gradient-primary text-primary-foreground rounded-xl">
            로그인하기
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-reveal-up space-y-4">
      <div>
        <h1 className="text-2xl font-bold">감정 리포트</h1>
        <p className="text-sm text-muted-foreground mt-1">기록이 쌓일수록 흐름이 보여요</p>
      </div>

      {/* 기록 진입 안내 — 기록은 홈에서 */}
      <button
        onClick={() => navigate("/dashboard")}
        className="w-full flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors p-3.5 text-left"
      >
        <img src={CHITO_POSES.waving} alt="" className="w-10 h-10 object-contain shrink-0" />
        <span className="flex-1 text-sm font-medium">
          오늘 감정 기록은 <span className="text-primary font-semibold">홈에서 치토와</span> 나눠요
        </span>
        <Home className="w-4 h-4 text-primary shrink-0" />
      </button>

      <EmotionHistory userId={userId} refreshKey={0} />
    </div>
  );
}
