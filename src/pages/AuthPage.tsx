import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Supabase auth
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm animate-reveal-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">마인드코치 AI</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">
            {isLogin ? "다시 오셨군요!" : "환영합니다"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "계속하려면 로그인하세요." : "계정을 만들어 시작하세요."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input id="name" placeholder="홍길동" className="rounded-xl" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" placeholder="email@example.com" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" type="password" placeholder="••••••••" className="rounded-xl" />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full">
            {isLogin ? "로그인" : "회원가입"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}{" "}
          <button
            className="text-primary font-semibold hover:underline"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "회원가입" : "로그인"}
          </button>
        </p>
      </div>
    </div>
  );
}
