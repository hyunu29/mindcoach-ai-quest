import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import SectionHeader from "@/components/landing/SectionHeader";

export default function CtaSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ref = useScrollReveal();

  const handleStart = () => navigate(user ? "/dashboard" : "/auth");

  return (
    <section className="py-24 px-6 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/10 to-primary/5" />
      <div className="container max-w-2xl text-center relative z-10">
        <SectionHeader
          className="mb-8"
          eyebrow="지금 시작하기"
          title="지금, 나를 이해하는 첫 걸음을 시작하세요"
          subtitle="무료로 간이 심리검사를 받고 AI 코칭을 경험해보세요."
        />
        <Button
          size="xl"
          onClick={handleStart}
          className="rounded-full px-9 gradient-primary gradient-primary-hover text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
        >
          무료로 시작하기
        </Button>
      </div>
    </section>
  );
}
