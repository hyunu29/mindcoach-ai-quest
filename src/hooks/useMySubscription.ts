import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MySubscription {
  id: string;
  status: string;
  current_period_end: string;
  daysRemaining: number;
  cancelAtPeriodEnd: boolean;
}

export function useMySubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    void (async () => {
      const { data } = await (supabase.from('user_subscriptions') as unknown as {
        select: (cols: string) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: string) => {
              gt: (c: string, v: string) => {
                order: (c: string, o: { ascending: boolean }) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{
                      data: {
                        id: string;
                        status: string;
                        current_period_end: string;
                        cancel_at_period_end: boolean | null;
                      } | null;
                    }>;
                  };
                };
              };
            };
          };
        };
      })
        .select('id, status, current_period_end, cancel_at_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString())
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const days = Math.ceil(
          (new Date(data.current_period_end).getTime() - Date.now()) / 86400000,
        );
        setSubscription({
          id: data.id,
          status: data.status,
          current_period_end: data.current_period_end,
          daysRemaining: days,
          cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const setCancelAtPeriodEnd = useCallback(
    async (cancel: boolean): Promise<boolean> => {
      if (!subscription) return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('user_subscriptions') as any)
        .update({ cancel_at_period_end: cancel })
        .eq('id', subscription.id);
      if (!error) {
        setSubscription({ ...subscription, cancelAtPeriodEnd: cancel });
        return true;
      }
      return false;
    },
    [subscription],
  );

  return { subscription, loading, setCancelAtPeriodEnd };
}
