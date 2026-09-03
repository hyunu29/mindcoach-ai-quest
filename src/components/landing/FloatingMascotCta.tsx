import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CHITO_EMBLEM_URL } from "@/lib/character/chito";
import { track } from "@/lib/analytics";

/** 랜딩 우하단 고정 마스코트 CTA — 스크롤 시 노출 (docs/design/DESIGN-TEMPLATES.md 패턴 5) */
export default function FloatingMascotCta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    void track("floating_cta_clicked", {});
    navigate(user ? "/dashboard" : "/auth");
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-40 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <button
        onClick={handleClick}
        className="relative flex items-center gap-2 h-12 pl-12 pr-5 rounded-full gradient-primary gradient-primary-hover text-primary-foreground text-sm font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.97] transition-all"
      >
        {/* 버튼에 걸쳐 있는 치토 엠블럼 */}
        <span className="absolute -left-1 -top-3 w-12 h-12 rounded-full bg-white ring-2 ring-primary/20 shadow-md overflow-hidden flex items-center justify-center">
          <img src={CHITO_EMBLEM_URL} alt="" className="w-9 h-9 object-contain" />
        </span>
        무료 검사 시작하기
      </button>
    </div>
  );
}
