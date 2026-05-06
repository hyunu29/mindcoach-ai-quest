import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

export default function MockCheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const orderId = params.get("orderId") ?? "";
  const amount = Number(params.get("amount") ?? 0);
  const productName = params.get("productName") ?? "상품";

  const handleSuccess = () => {
    const paymentKey = `mock_${crypto.randomUUID()}`;
    const q = new URLSearchParams({ orderId, paymentKey, amount: String(amount) });
    navigate(`/payment/success?${q.toString()}`, { replace: true });
  };

  const handleFail = () => {
    const q = new URLSearchParams({
      orderId,
      code: "PAYMENT_FAILED",
      message: "결제 처리 중 오류가 발생했습니다",
    });
    navigate(`/payment/fail?${q.toString()}`, { replace: true });
  };

  const handleCancel = () => {
    const q = new URLSearchParams({
      orderId,
      code: "USER_CANCEL",
      message: "사용자가 결제를 취소했습니다",
    });
    navigate(`/payment/fail?${q.toString()}`, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <Badge variant="outline" className="w-fit gap-1.5 mb-2">
            <FlaskConical className="w-3 h-3" />
            🧪 Mock PG (개발용)
          </Badge>
          <CardTitle className="text-lg">결제 시뮬레이션</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">상품명</span>
              <span className="font-medium">{productName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">결제 금액</span>
              <span className="font-bold">{amount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>주문번호</span>
              <span className="font-mono truncate ml-2">{orderId}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={handleSuccess} className="w-full" size="lg">
              결제 성공
            </Button>
            <Button onClick={handleFail} variant="destructive" className="w-full">
              결제 실패
            </Button>
            <Button onClick={handleCancel} variant="outline" className="w-full">
              결제 취소
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            이 화면은 실제 결제가 아닙니다. 개발 테스트용 시뮬레이터입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}