import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

export default function AdminExperienceBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    void (supabase.from('profiles') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: { user_type: string | null } | null }>;
        };
      };
    })
      .select('user_type')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setIsAdmin(data?.user_type === 'academy_admin'));
  }, [user]);

  if (!isAdmin) return null;

  return (
    <div className="sticky top-0 z-40 bg-primary/10 border-b border-primary/30 px-4 py-2 flex items-center justify-between gap-2">
      <span className="text-xs">🎓 관리자 체험 중 · 원생이 보는 화면입니다</span>
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <ArrowLeft className="w-3 h-3" /> 관리자 대시보드
      </button>
    </div>
  );
}
