import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { ArrowDown } from "lucide-react";

export default function HeroSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ref = useScrollReveal();

  const handleStart = () => navigate(user ? "/dashboard" : "/auth");
  const scrollToFeatures = () =>
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-primary opacity-95" />
      {/* Wave SVG */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" className="w-full" preserveAspectRatio="none">
          <path
            d="M0,64 C480,120 960,0 1440,64 L1440,120 L0,120 Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>

      <div className="container relative z-10 px-6 pt-24 pb-32" ref={ref}>
        <div className="max-w-3xl mx-auto text-center">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-8">
            <span className="text-sm font-medium text-white/90">대한민국 수험생 대표 심리코칭</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
            마인드코치
          </h1>

          {/* Sub Headline */}
          <p className="text-white/80 text-lg md:text-xl mb-10 leading-relaxed whitespace-pre-line">
            수험생들의 불안을 걷어내고{"\n"}
            스스로를 돕는 방법을 주는{"\n"}
            AI 기반 수험생 전문 멘탈코칭
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleStart}
              size="xl"
              className="bg-white text-primary font-bold shadow-lg hover:bg-white/90 hover:shadow-xl transition-all"
            >
              무료로 시작하기
            </Button>
            <Button
              onClick={scrollToFeatures}
              size="xl"
              variant="outline"
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm"
            >
              서비스 둘러보기
              <ArrowDown className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
