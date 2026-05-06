import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

// TODO(5-2b): call verify-payment Edge Function here
export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const orderId = params.get("orderId") ?? "";
  const paymentKey = params.get("paymentKey") ?? "";
  const amount = params.get("amount") ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>결제 완료</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">주문번호</span>
              <span className="font-mono text-xs truncate ml-2">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">결제키</span>
              <span className="font-mono text-xs truncate ml-2">{paymentKey}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">금액</span>
              <span className="font-bold">{Number(amount).toLocaleString()}원</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            검증 중... (5-2b 단계에서 서버 검증 추가 예정)
          </p>

          <Button
            disabled
            className="w-full"
            size="lg"
            onClick={() => navigate("/tests")}
          >
            검사 받으러 가기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}