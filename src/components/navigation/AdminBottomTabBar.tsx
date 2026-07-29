import { LayoutDashboard, Settings, ClipboardCheck, MessageCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const tabs = [
  { icon: LayoutDashboard, label: "대시보드", to: "/admin", exact: true },
  { icon: ClipboardCheck, label: "교직원 검사", to: "/admin/staff-test", exact: false },
  { icon: MessageCircle, label: "코칭 체험", to: "/coaching", exact: false },
  { icon: Settings, label: "학원", to: "/admin/settings", exact: false },
];

export default function AdminBottomTabBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-t border-border/50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const active = tab.exact
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.exact}
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
