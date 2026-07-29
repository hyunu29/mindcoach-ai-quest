import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MySubscription {
  id: string;
  status: string;
  current_period_end: string;
  daysRemaining: number;
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
                      data: { id: string; status: string; current_period_end: string } | null;
                    }>;
                  };
                };
              };
            };
          };
        };
      })
        .select('id, status, current_period_end')
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
        setSubscription({ ...data, daysRemaining: days });
      }
      setLoading(false);
    })();
  }, [user]);

  return { subscription, loading };
}
