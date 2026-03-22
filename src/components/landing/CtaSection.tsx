import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export default function CtaSection() {
  const navigate = useNavigate();
  const ref = useScrollReveal();

  return (
    <section className="py-20 px-6" ref={ref}>
      <div className="container max-w-2xl text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          지금 바로 시작하세요
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          무료 심리검사로 나의 마음 상태를 확인하고,<br />
          AI 코칭으로 한 단계 성장해 보세요.
        </p>
        <Button variant="hero" size="xl" onClick={() => navigate("/auth")}>
          무료로 시작하기
        </Button>
      </div>
    </section>
  );
}
