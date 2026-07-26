import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useAcademyVouchers() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      setLoading(false);
      return;
    }
    const { data } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: number | null; error: unknown }>)(
      'count_unused_academy_vouchers',
      { p_user_id: user.id },
    );
    setCount(typeof data === 'number' ? data : 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const redeem = useCallback(
    async (testId: string): Promise<boolean> => {
      if (!user) return false;
      const { data } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: boolean | null; error: unknown }>)(
        'redeem_academy_voucher',
        { p_user_id: user.id, p_test_id: testId },
      );
      if (data === true) {
        await refresh();
        return true;
      }
      return false;
    },
    [user, refresh],
  );

  return { count, loading, refresh, redeem };
}
