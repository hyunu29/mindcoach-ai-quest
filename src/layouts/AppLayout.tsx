import { Outlet } from "react-router-dom";
import BottomTabBar from "@/components/navigation/BottomTabBar";
import DesktopSidebar from "@/components/navigation/DesktopSidebar";
import AdminExperienceBanner from "@/components/academy/AdminExperienceBanner";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <AdminExperienceBanner />
      <div className="flex flex-1 min-h-0">
        <DesktopSidebar />
        <main className="flex-1 pb-20 md:pb-0">
          <div className="max-w-2xl mx-auto p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}
