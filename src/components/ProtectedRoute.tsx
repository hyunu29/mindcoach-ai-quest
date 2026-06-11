import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type ProfileGuard = { user_type: string | null; onboarded_at: string | null };

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [profileChecked, setProfileChecked] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setProfileChecked(true);
      return;
    }
    // Supabase 타입은 Lovable에서 마이그레이션 push 후 자동 재생성됨.
    // 그 사이 빌드를 위한 좁은 타입 우회 (OnboardingPage와 동일 패턴).
    void (supabase.from('profiles') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: ProfileGuard | null }>;
        };
      };
    })
      .select('user_type, onboarded_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.user_type === 'academy_admin') setRedirectTo('/admin');
        else if (data?.user_type === 'super_admin') setRedirectTo('/sysadmin');
        else if (!data?.onboarded_at) setRedirectTo('/onboarding');
        setProfileChecked(true);
      })
      .catch(() => setProfileChecked(true));
  }, [user, loading]);

  if (loading || !profileChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
