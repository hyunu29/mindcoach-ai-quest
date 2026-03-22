import { Outlet } from "react-router-dom";
import BottomTabBar from "@/components/navigation/BottomTabBar";
import DesktopSidebar from "@/components/navigation/DesktopSidebar";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
      <BottomTabBar />
    </div>
  );
}
