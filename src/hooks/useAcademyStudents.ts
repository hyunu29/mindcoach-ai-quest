import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Signal = 'green' | 'yellow' | 'red' | 'unassessed';

export interface StudentSignalRow {
  user_id: string;
  nickname: string | null;
  school_name: string | null;
  grade: string | null;
  risk_area_count: number;
  emotion_avg: number | null;
  last_activity_at: string | null;
  signal: Signal;
}

export function useAcademyStudents(academyId: string | null) {
  const [rows, setRows] = useState<StudentSignalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!academyId) return;
    setLoading(true);
    const run = async () => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: StudentSignalRow[] | null; error: unknown }>)(
        'calculate_academy_signals',
        { p_academy_id: academyId },
      );
      if (!error && data) setRows(data);
      setLoading(false);
    };
    void run();
  }, [academyId]);

  return { rows, loading };
}
