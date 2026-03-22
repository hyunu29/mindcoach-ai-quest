import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TrustSection from "@/components/landing/TrustSection";
import CtaSection from "@/components/landing/CtaSection";
import { Sparkles } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>마인드코치 AI</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            로그인
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="container max-w-2xl text-center animate-reveal-up">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            수험생 맞춤 심리 코칭
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-[1.15] mb-5">
            나를 이해하는<br />
            <span className="gradient-text">첫 번째 단계</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-md mx-auto leading-relaxed">
            AI가 분석하는 수험생 맞춤 심리 코칭으로<br className="hidden md:block" />
            공부도, 마음도 함께 성장하세요.
          </p>
          <Button variant="hero" size="xl" onClick={() => navigate("/auth")}>
            무료로 시작하기
          </Button>
        </div>
      </section>

      <FeaturesSection />
      <TrustSection />
      <CtaSection />

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50 text-center text-xs text-muted-foreground">
        © 2026 마인드코치 AI. All rights reserved.
      </footer>
    </div>
  );
}
