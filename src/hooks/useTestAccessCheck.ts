import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isFreeTest } from '@/lib/payments/free-tests';

export type AccessReason =
  | 'free_test'
  | 'has_paid_access'
  | 'expired'
  | 'never_purchased'
  | 'not_logged_in';

export interface AccessCheckResult {
  loading: boolean;
  allowed: boolean;
  reason: AccessReason;
  expiresAt?: string;
  daysRemaining?: number;
}

export function useTestAccessCheck(testSlug: string): AccessCheckResult {
  const [state, setState] = useState<AccessCheckResult>({
    loading: true,
    allowed: false,
    reason: 'never_purchased',
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (isFreeTest(testSlug)) {
        if (!cancelled) setState({ loading: false, allowed: true, reason: 'free_test' });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setState({ loading: false, allowed: false, reason: 'not_logged_in' });
        return;
      }

      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('user_test_access')
        .select('expires_at')
        .eq('user_id', user.id)
        .eq('test_id', testSlug)
        .gt('expires_at', nowIso)
        .order('expires_at', { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (data && data.length > 0) {
        const expiresAt = data[0].expires_at as string;
        const daysRemaining = Math.ceil(
          (new Date(expiresAt).getTime() - Date.now()) / 86400000,
        );
        setState({
          loading: false,
          allowed: true,
          reason: 'has_paid_access',
          expiresAt,
          daysRemaining,
        });
        return;
      }

      const { data: expiredData } = await supabase
        .from('user_test_access')
        .select('expires_at')
        .eq('user_id', user.id)
        .eq('test_id', testSlug)
        .lte('expires_at', nowIso)
        .order('expires_at', { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (expiredData && expiredData.length > 0) {
        setState({
          loading: false,
          allowed: false,
          reason: 'expired',
          expiresAt: expiredData[0].expires_at as string,
        });
      } else {
        setState({ loading: false, allowed: false, reason: 'never_purchased' });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [testSlug]);

  return state;
}