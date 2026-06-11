import { Sparkles } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="py-12 px-6 border-t border-border/50">
      <div className="container max-w-4xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-2 font-bold">
            <Sparkles className="w-4 h-4 text-primary" />
            마이치
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">이용약관</a>
            <a href="#" className="hover:text-foreground transition-colors">개인정보처리방침</a>
            <a href="#" className="hover:text-foreground transition-colors">문의하기</a>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            © 2026 마이치. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/70">
            본 서비스는 전문 의료 상담을 대체하지 않습니다.
            긴급한 경우 자살예방상담전화 1393으로 연락해주세요.
          </p>
        </div>
      </div>
    </footer>
  );
}
