import { Home, ClipboardCheck, MessageCircle, BarChart3, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const tabs = [
  { icon: Home, label: "홈", to: "/dashboard" },
  { icon: ClipboardCheck, label: "검사", to: "/tests" },
  { icon: MessageCircle, label: "코칭", to: "/coaching" },
  { icon: BarChart3, label: "감정", to: "/emotion" },
  { icon: User, label: "MY", to: "/profile" },
];

export default function BottomTabBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-t border-border/50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const active = location.pathname.startsWith(tab.to);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/dashboard"}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
              activeClassName=""
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
