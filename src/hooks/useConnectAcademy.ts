import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { track } from '@/lib/analytics';

export function useConnectAcademy() {
  const { user } = useAuth();
  const [connecting, setConnecting] = useState(false);

  const connect = async (academyId: string): Promise<boolean> => {
    if (!user) return false;
    setConnecting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any)
      .update({
        academy_id: academyId,
        academy_joined_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (!error) {
      // 환영 팩 지급 (크레딧 10 — 2026-08-12 정책). 실패해도 연결 자체는 성공 처리.
      await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: unknown }>)('grant_academy_welcome_pack', {
        p_user_id: user.id,
        p_academy_id: academyId,
      });
      void track('academy_connected', { academy_id: academyId });
      setConnecting(false);
      return true;
    }
    setConnecting(false);
    return false;
  };

  return { connect, connecting };
}
