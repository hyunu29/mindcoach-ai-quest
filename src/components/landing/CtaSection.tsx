import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export default function CtaSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ref = useScrollReveal();

  const handleStart = () => navigate(user ? "/dashboard" : "/auth");

  return (
    <section className="py-24 px-6 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/10 to-primary/5" />
      <div className="container max-w-2xl text-center relative z-10">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          지금, 나를 이해하는 첫 걸음을 시작하세요
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          무료로 심리검사를 받고 AI 코칭을 경험해보세요.
        </p>
        <Button variant="hero" size="xl" onClick={handleStart}>
          무료로 시작하기
        </Button>
      </div>
    </section>
  );
}
