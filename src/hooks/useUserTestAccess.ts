import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TestAccess {
  testId: string;
  expiresAt: string;
  daysRemaining: number;
}

export function useUserTestAccess() {
  const [accessMap, setAccessMap] = useState<Record<string, TestAccess>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('user_test_access')
        .select('test_id, expires_at')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString());
      if (cancelled) return;
      const map: Record<string, TestAccess> = {};
      (data ?? []).forEach((row) => {
        const days = Math.ceil(
          (new Date(row.expires_at).getTime() - Date.now()) / 86400000,
        );
        if (
          !map[row.test_id] ||
          new Date(row.expires_at) > new Date(map[row.test_id].expiresAt)
        ) {
          map[row.test_id] = {
            testId: row.test_id,
            expiresAt: row.expires_at,
            daysRemaining: days,
          };
        }
      });
      setAccessMap(map);
      setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { accessMap, loading };
}