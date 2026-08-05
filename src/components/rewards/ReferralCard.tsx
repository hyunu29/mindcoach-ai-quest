import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// supabase.rpc를 변수로 분리하면 this 바인딩이 끊겨 런타임 에러 발생 — 반드시 래핑
const rpc = (fn: string) =>
  (supabase.rpc as unknown as (
    f: string,
  ) => Promise<{ data: string | null; error: unknown }>).call(supabase, fn);

/** 내 초대코드 표시 + 공유 카드 */
export default function ReferralCard() {
  const { user } = useAuth();
  const [myCode, setMyCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await rpc('get_my_referral_code');
      if (typeof data === 'string') setMyCode(data);
    })();
  }, [user]);

  const copyShareText = async () => {
    if (!myCode) return;
    const text = `마이치에서 치토와 함께 마음을 돌봐요 🥔\n가입 후 마이페이지에서 내 초대코드 [${myCode}]를 등록하면, 우리 둘 다 유료검사 이용권 3개 + AI 크레딧 10개를 받아요!\nhttps://mindcoach-ai-quest.vercel.app`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('초대 메시지가 복사되었어요! 친구에게 붙여넣어 보내주세요.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('복사에 실패했어요. 코드를 직접 전달해주세요.');
    }
  };

  return (
    <Card className="p-5 rounded-2xl border-primary/20 bg-primary/5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-primary" />
        <h2 className="font-bold">친구 초대</h2>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        친구가 가입하고 내 코드를 등록하면 <strong className="text-foreground">두 사람 모두</strong> 유료검사
        이용권 <strong className="text-foreground">3개</strong> + AI 크레딧{' '}
        <strong className="text-foreground">10개</strong>를 받아요.
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2.5 rounded-xl bg-background border border-border font-mono text-sm font-semibold tracking-wider text-center">
          {myCode ?? '코드 생성 중...'}
        </div>
        <Button
          variant="outline"
          className="rounded-xl shrink-0"
          onClick={copyShareText}
          disabled={!myCode}
        >
          {copied ? <Check className="w-4 h-4 mr-1 text-accent" /> : <Copy className="w-4 h-4 mr-1" />}
          초대장 복사
        </Button>
      </div>
    </Card>
  );
}
