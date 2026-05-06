import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentFailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const orderId = params.get("orderId") ?? "";
  const code = params.get("code") ?? "UNKNOWN";
  const message = params.get("message") ?? "결제에 실패했습니다";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle>결제 실패</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">주문번호</span>
              <span className="font-mono text-xs truncate ml-2">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">코드</span>
              <span className="font-mono text-xs">{code}</span>
            </div>
            <div className="pt-2 border-t">
              <p className="text-muted-foreground">{message}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button className="w-full" size="lg" onClick={() => navigate("/tests")}>
              다시 시도
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              홈으로
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}