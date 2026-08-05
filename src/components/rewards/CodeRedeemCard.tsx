import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ticket, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type RedeemResult = {
  ok: boolean;
  error?: string;
  label?: string;
  credits?: number;
  tests_unlocked?: number;
  valid_until?: string;
};

// supabase.rpc를 변수로 분리하면 this 바인딩이 끊겨 런타임 에러 발생 — 반드시 래핑
const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as (
    f: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: RedeemResult | null; error: unknown }>).call(supabase, fn, args);

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: '존재하지 않는 코드예요. 다시 확인해주세요.',
  EXPIRED: '기간이 만료된 코드예요.',
  ALREADY_REDEEMED: '이미 등록한 코드예요.',
  FULLY_REDEEMED: '선착순 인원이 마감된 코드예요.',
  SELF_REFERRAL: '내 초대코드는 등록할 수 없어요.',
  MUTUAL_REFERRAL: '이미 서로 초대를 완료한 친구예요.',
  UNAUTHORIZED: '로그인이 필요해요.',
};

interface Props {
  onRedeemed?: () => void;
}

/** 이벤트 코드 + 친구 초대코드 공용 입력 카드 */
export default function CodeRedeemCard({ onRedeemed }: Props) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      // 1) 이벤트 코드 시도
      const { data: eventRes } = await rpc('redeem_event_code', { p_code: trimmed });
      if (eventRes?.ok) {
        const until = eventRes.valid_until
          ? new Date(eventRes.valid_until).toLocaleDateString('ko-KR')
          : '';
        toast.success(`🎉 ${eventRes.label ?? '이벤트'} 혜택 적용!`, {
          description: `유료검사 ${eventRes.tests_unlocked ?? 0}종 해금 + AI 크레딧 ${eventRes.credits ?? 0} (${until}까지)`,
        });
        setCode('');
        onRedeemed?.();
        return;
      }
      // 이벤트 코드가 아니면(NOT_FOUND) 초대코드로 시도
      if (eventRes?.error === 'NOT_FOUND') {
        const { data: refRes } = await rpc('redeem_referral_code', { p_code: trimmed });
        if (refRes?.ok) {
          toast.success('🎁 친구 초대 보상 지급 완료!', {
            description: '나와 친구 모두 유료검사 이용권 3개 + AI 크레딧 10개를 받았어요.',
          });
          setCode('');
          onRedeemed?.();
          return;
        }
        toast.error(ERROR_MESSAGES[refRes?.error ?? ''] ?? '코드 등록에 실패했어요.');
        return;
      }
      toast.error(ERROR_MESSAGES[eventRes?.error ?? ''] ?? '코드 등록에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-5 rounded-2xl border-border/50 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Ticket className="w-4 h-4 text-primary" />
        <h2 className="font-bold">이벤트 · 초대 코드</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        이벤트 코드 또는 친구의 초대코드를 입력하면 혜택이 바로 적용돼요.
      </p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
          placeholder="코드 입력 (예: MYCH-ABC123)"
          className="rounded-xl uppercase"
          maxLength={20}
        />
        <Button
          onClick={handleRedeem}
          disabled={!code.trim() || submitting}
          className="rounded-xl shrink-0"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '등록'}
        </Button>
      </div>
    </Card>
  );
}
