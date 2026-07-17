import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    void (async () => {
      const { data } = await (supabase.from('profiles') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: { user_type: string | null; onboarded_at: string | null } | null }>;
          };
        };
      })
        .select('user_type, onboarded_at')
        .eq('id', user.id)
        .single();
      if (data?.user_type === 'academy_admin') navigate('/admin', { replace: true });
      else if (data?.user_type === 'super_admin') navigate('/sysadmin', { replace: true });
      else if (!data?.onboarded_at) navigate('/onboarding', { replace: true });
      else navigate('/dashboard', { replace: true });
    })();
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}
