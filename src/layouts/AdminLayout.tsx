import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex flex-col w-56 border-r border-border/50 bg-card p-4">
        <div className="font-bold text-lg mb-8 px-2">마이치 관리자</div>
        <nav className="flex flex-col gap-1">
          <NavLink
            to="/admin"
            end
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            activeClassName="bg-primary/10 text-primary"
          >
            <LayoutDashboard className="w-4 h-4" />
            대시보드
          </NavLink>
          <NavLink
            to="/admin/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            activeClassName="bg-primary/10 text-primary"
          >
            <Settings className="w-4 h-4" />
            학원 정보
          </NavLink>
        </nav>
        <button
          onClick={signOut}
          className="mt-auto flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
