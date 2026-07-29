import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut, ClipboardCheck, MessageCircle } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import AdminBottomTabBar from '@/components/navigation/AdminBottomTabBar';
import { useMyAcademy } from '@/hooks/useMyAcademy';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { academy } = useMyAcademy();
  const { user } = useAuth();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex flex-col w-56 border-r border-border/50 bg-card p-4">
        <div className="mb-8 px-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">마이치 관리자</div>
          <div className="font-bold text-base mt-0.5 truncate">
            {academy?.name ?? '학원 정보 없음'}
          </div>
          {user?.email && (
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{user.email}</div>
          )}
        </div>
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

          <div className="mt-4 mb-1 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            체험
          </div>
          <NavLink
            to="/tests"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            activeClassName="bg-primary/10 text-primary"
          >
            <ClipboardCheck className="w-4 h-4" />
            심리검사 체험
          </NavLink>
          <NavLink
            to="/coaching"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            activeClassName="bg-primary/10 text-primary"
          >
            <MessageCircle className="w-4 h-4" />
            AI 코칭 체험
          </NavLink>
          <NavLink
            to="/admin/staff-test"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            activeClassName="bg-primary/10 text-primary"
          >
            <ClipboardCheck className="w-4 h-4" />
            교직원 심리검사
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
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <Outlet />
      </main>
      <AdminBottomTabBar />
    </div>
  );
}
