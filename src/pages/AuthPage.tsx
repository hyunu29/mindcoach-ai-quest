import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

export default function AuthPage() {
  const { user, loading: authLoading, signInWithKakao } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleKakao = async () => {
    setSubmitting(true);
    const { error } = await signInWithKakao();
    if (error) {
      toast.error(error);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm animate-reveal-up text-center space-y-6">
        <div>
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

        <p className="text-xs text-muted-foreground">
          가입 시 <a className="underline" href="/terms">이용약관</a>과 <a className="underline" href="/privacy">개인정보처리방침</a>에 동의합니다.
        </p>
      </div>
    </div>
  );
}
