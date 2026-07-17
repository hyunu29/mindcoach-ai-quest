import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Loader2 } from 'lucide-react';
import { useMyAcademy } from '@/hooks/useMyAcademy';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const { academy, loading } = useMyAcademy();

  const copyCode = () => {
    if (!academy) return;
    void navigator.clipboard.writeText(academy.code);
    toast.success('학원 코드를 복사했어요');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-2">
        <h1 className="text-xl font-bold">연결된 학원이 없어요</h1>
        <p className="text-sm text-muted-foreground">
          마이치 운영팀에 학원 등록을 문의해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-4 animate-reveal-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">학원 정보</h1>
      </header>

      <Card className="p-5 rounded-2xl space-y-4">
        <div>
          <div className="text-xs text-muted-foreground">학원명</div>
          <div className="font-medium mt-0.5">{academy.name}</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">학원 코드 (원생 공유용)</div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-sm py-1 px-2">
              {academy.code}
            </Badge>
            <button
              onClick={copyCode}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              aria-label="학원 코드 복사"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground pt-3 border-t">
          학원명이나 코드 변경이 필요하면 마이치 운영팀에 문의해 주세요.
        </p>
      </Card>
    </div>
  );
}
