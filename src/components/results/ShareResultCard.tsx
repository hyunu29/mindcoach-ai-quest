import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Link2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { track } from '@/lib/analytics';
import {
  isKakaoShareAvailable,
  isWebShareAvailable,
  shareToKakao,
  shareViaSystem,
} from '@/lib/share';

// supabase.rpc를 변수로 분리하면 this 바인딩이 끊겨 런타임 에러 발생 — 반드시 래핑
const rpc = (fn: string) =>
  (supabase.rpc as unknown as (
    f: string,
  ) => Promise<{ data: string | null; error: unknown }>).call(supabase, fn);

interface ShareResultCardProps {
  testName: string;
  riskLabel: string;
  testId: string;
}

/** 검사 결과 공유 카드 — 카카오톡 / OS 공유 시트 / 링크 복사 */
export default function ShareResultCard({ testName, riskLabel, testId }: ShareResultCardProps) {
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

  const shareUrl = `${window.location.origin}/?utm_source=result_share`;
  const shareTitle = `나 마이치에서 「${testName}」 해봤어!`;
  const referralLine = myCode
    ? `가입하고 마이페이지에서 내 초대코드 [${myCode}]를 등록하면 우리 둘 다 유료검사 이용권 + AI 크레딧을 받아! 🎁`
    : '무료 통합 심리검사로 너의 마음 상태도 확인해봐!';
  const shareDescription = `내 결과는 "${riskLabel}" 단계래. ${referralLine}`;
  const shareText = `${shareTitle}\n${shareDescription}`;

  const handleKakao = async () => {
    const ok = await shareToKakao({
      title: shareTitle,
      description: shareDescription,
      url: shareUrl,
      buttonTitle: '나도 검사해보기',
    });
    if (ok) {
      void track('result_shared', { channel: 'kakao', test_id: testId });
    } else {
      toast.error('카카오톡 공유를 열지 못했어요. 링크 복사를 이용해주세요.');
    }
  };

  const handleSystemShare = async () => {
    const outcome = await shareViaSystem(shareText, shareUrl);
    if (outcome === 'shared') {
      void track('result_shared', { channel: 'web_share', test_id: testId });
    } else if (outcome === 'copied') {
      void track('result_shared', { channel: 'clipboard', test_id: testId });
      toast.success('공유 메시지가 복사되었어요! 친구에게 붙여넣어 보내주세요.');
    } else {
      return;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      void track('result_shared', { channel: 'clipboard', test_id: testId });
      toast.success('공유 메시지가 복사되었어요! 친구에게 붙여넣어 보내주세요.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('복사에 실패했어요.');
    }
  };

  return (
    <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
      <h2 className="font-bold mb-1">결과 공유하기</h2>
      <p className="text-xs text-muted-foreground mb-4">
        친구에게 공유하고 함께 마음을 확인해보세요.
        {user && ' 친구가 내 초대코드를 등록하면 둘 다 혜택을 받아요.'}
      </p>
      <div className="flex gap-2">
        {isKakaoShareAvailable() && (
          <Button
            onClick={handleKakao}
            className="flex-1 rounded-xl gap-1.5 bg-[#FEE500] text-[#191919] hover:bg-[#FDD800]"
          >
            <Share2 className="w-4 h-4" />
            카카오톡
          </Button>
        )}
        {isWebShareAvailable() && (
          <Button variant="outline" className="flex-1 rounded-xl gap-1.5" onClick={handleSystemShare}>
            <Share2 className="w-4 h-4" />
            공유하기
          </Button>
        )}
        <Button variant="outline" className="flex-1 rounded-xl gap-1.5" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4 text-accent" /> : <Link2 className="w-4 h-4" />}
          링크 복사
        </Button>
      </div>
    </Card>
  );
}
