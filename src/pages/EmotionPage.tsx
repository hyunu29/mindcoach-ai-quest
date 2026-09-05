import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import EmotionAgentChat from "@/components/emotion/EmotionAgentChat";
import EmotionHistory from "@/components/emotion/EmotionHistory";

export default function EmotionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [todayRecord, setTodayRecord] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("record");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      setLoading(false);
    };
    init();
  }, []);

  const checkTodayRecord = useCallback(async () => {
    if (!userId) return;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

    const { data } = await supabase
      .from('emotion_records')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', start)
      .lte('recorded_at', end)
      .order('recorded_at', { ascending: false })
      .limit(1);

    setTodayRecord(data?.[0] || null);
  }, [userId]);

  useEffect(() => { if (userId) checkTodayRecord(); }, [userId, checkTodayRecord, refreshKey]);

  // 자동 저장 후에도 요약 카드를 계속 볼 수 있도록 탭은 전환하지 않는다
  const handleRecordSaved = () => {
    setRefreshKey(k => k + 1);
  };

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
        <h1 className="text-2xl font-bold">감정 트래킹</h1>
        <Card className="p-8 rounded-2xl text-center">
          <p className="text-muted-foreground mb-4">로그인하면 감정을 기록할 수 있어요.</p>
          <Button onClick={() => navigate("/auth")} className="gradient-primary text-primary-foreground rounded-xl">
            로그인하기
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-reveal-up">
      <h1 className="text-2xl font-bold mb-4">감정 트래킹</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4 rounded-xl">
          <TabsTrigger value="record" className="rounded-lg">감정 기록</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg">기록 & 리포트</TabsTrigger>
        </TabsList>

        <TabsContent value="record">
          {/* 고정 높이 — 대화가 길어져도 페이지가 늘어나지 않고 내부 스크롤 + 입력창 하단 고정 */}
          <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden h-[calc(100dvh-240px)] min-h-[480px]">
            <EmotionAgentChat
              userId={userId}
              onRecordSaved={handleRecordSaved}
              todayRecord={todayRecord}
            />
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <EmotionHistory userId={userId} refreshKey={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
