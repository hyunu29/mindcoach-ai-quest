import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

async function routeAfterLogin(userId: string): Promise<string> {
  const { data } = await (supabase.from('profiles') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: { user_type: string | null; onboarded_at: string | null } | null }>;
      };
    };
  })
    .select('user_type, onboarded_at')
    .eq('id', userId)
    .single();
  if (data?.user_type === 'academy_admin') return '/admin';
  if (data?.user_type === 'super_admin') return '/sysadmin';
  if (!data?.onboarded_at) return '/onboarding';
  return '/dashboard';
}

export default function AuthPage() {
  const { user, loading: authLoading, signInWithKakao } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    void routeAfterLogin(user.id).then((path) => navigate(path, { replace: true }));
  }, [user, authLoading, navigate]);

  if (authLoading) return null;

  const handleKakao = async () => {
    setSubmitting(true);
    const { error } = await signInWithKakao();
    if (error) {
      toast.error(error);
      setSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setEmailSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      toast.error(error?.message ?? '로그인에 실패했어요');
      setEmailSubmitting(false);
      return;
    }
    const path = await routeAfterLogin(data.user.id);
    navigate(path, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm animate-reveal-up space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">마이치</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">시작하기</h1>
          <p className="text-sm text-muted-foreground">카카오 계정으로 1초 만에 시작하세요.</p>
        </div>

        <Button
          onClick={handleKakao}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-[#FEE500] text-[#191919] hover:bg-[#FDD800]"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '카카오로 시작하기'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          가입 시 <a className="underline" href="/terms">이용약관</a>과 <a className="underline" href="/privacy">개인정보처리방침</a>에 동의합니다.
        </p>

        <div className="pt-4 border-t border-border/50">
          {!showEmail ? (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              학원 관리자이신가요? 이메일로 로그인
            </button>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <p className="text-xs font-medium text-center text-muted-foreground">학원 관리자 로그인</p>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="rounded-xl"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl"
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                disabled={emailSubmitting || !email.trim() || !password}
                className="w-full h-11 rounded-xl"
              >
                {emailSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '로그인'}
              </Button>
              <button
                type="button"
                onClick={() => setShowEmail(false)}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                취소
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
