import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import logo from "../../../public/logo.png";

export default function LandingNav() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleStart = () => navigate(user ? "/dashboard" : "/auth");

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/70 backdrop-blur-md shadow-sm ${
        scrolled ? "border-b border-border/50 shadow-md" : ""
      }`}
    >
      <div className="container flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-2 font-bold text-lg">
          <img src={logo} alt="마이치" className="h-8 w-auto" />
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => scrollTo("features")}>
            기능 소개
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollTo("expert")}>
            전문가 소개
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollTo("how-it-works")}>
            이용 방법
          </Button>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            로그인
          </Button>
          <Button variant="default" size="sm" onClick={handleStart}>
            무료 시작하기
          </Button>
        </div>
      </div>
    </header>
  );
}
