import { Home, ClipboardCheck, MessageCircle, BarChart3, User, History } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import logo from "../../../public/logo.png";

const links = [
  { icon: Home, label: "홈", to: "/dashboard" },
  { icon: ClipboardCheck, label: "심리검사", to: "/tests" },
  { icon: MessageCircle, label: "AI 코칭", to: "/coaching" },
  { icon: BarChart3, label: "감정 트래킹", to: "/emotion" },
  { icon: History, label: "내 기록", to: "/history" },
  { icon: User, label: "마이페이지", to: "/profile" },
];

export default function DesktopSidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen border-r border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 font-bold text-lg mb-8 px-2">
        <Sparkles className="w-5 h-5 text-primary" />
        마인드코치 AI
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/dashboard"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            activeClassName="bg-primary/10 text-primary"
          >
            <link.icon className="w-4.5 h-4.5" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
