import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export interface AcademyLookup {
  id: string;
  name: string;
}

interface Props {
  onFound: (academy: AcademyLookup) => void;
  buttonLabel?: string;
  autoFocus?: boolean;
}

export default function AcademyCodeInput({ onFound, buttonLabel = '연결', autoFocus }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    const { data, error: rpcError } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: AcademyLookup[] | null; error: unknown }>)(
      'get_academy_by_code',
      { p_code: trimmed },
    );
    setLoading(false);
    if (rpcError) {
      setError('코드 확인 중 오류가 발생했어요. 다시 시도해 주세요.');
      return;
    }
    if (!data || data.length === 0) {
      setError('이 코드에 해당하는 학원이 없어요');
      return;
    }
    onFound(data[0]);
    setCode('');
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="예: MYCH-2601"
          className="rounded-xl uppercase font-mono"
          autoFocus={autoFocus}
        />
        <Button onClick={submit} disabled={!code.trim() || loading} className="rounded-xl">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : buttonLabel}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}
