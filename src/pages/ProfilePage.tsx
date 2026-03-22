import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, LogOut, ChevronRight } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="space-y-6 animate-reveal-up">
      <h1 className="text-2xl font-bold">마이페이지</h1>

      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <div className="font-bold">사용자</div>
            <div className="text-sm text-muted-foreground">user@example.com</div>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        {["내 검사 기록", "알림 설정", "개인정보 수정", "이용약관", "고객센터"].map((item) => (
          <button
            key={item}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-card border border-border/50 text-sm font-medium hover:bg-muted transition-colors active:scale-[0.98]"
          >
            {item}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <Button variant="ghost" className="w-full text-destructive hover:text-destructive rounded-xl">
        <LogOut className="w-4 h-4 mr-2" />
        로그아웃
      </Button>
    </div>
  );
}
