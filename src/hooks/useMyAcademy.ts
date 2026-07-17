import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MyAcademy {
  id: string;
  name: string;
  code: string;
}

export function useMyAcademy() {
  const [academy, setAcademy] = useState<MyAcademy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data } = await (supabase.from('academies') as unknown as {
        select: (cols: string) => {
          maybeSingle: () => Promise<{ data: MyAcademy | null }>;
        };
      })
        .select('id, name, code')
        .maybeSingle();
      setAcademy(data);
      setLoading(false);
    };
    void run();
  }, []);

  return { academy, loading };
}
