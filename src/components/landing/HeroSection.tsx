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
        <div className="max-w-2xl mx-auto text-center md:text-left md:mx-0">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.15] mb-6">
            수험생의 마음을 지키는
            <br />
            AI 심리 코치
          </h1>
          <p className="text-white/80 text-base md:text-lg mb-10 max-w-lg leading-relaxed">
            20년 경력 수험생 심리 전문가의 노하우를
            <br className="hidden md:block" />
            AI로 만나보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
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
