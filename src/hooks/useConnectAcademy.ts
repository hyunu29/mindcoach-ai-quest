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
    setConnecting(false);
    if (!error) {
      void track('academy_connected', { academy_id: academyId });
      return true;
    }
    return false;
  };

  return { connect, connecting };
}
