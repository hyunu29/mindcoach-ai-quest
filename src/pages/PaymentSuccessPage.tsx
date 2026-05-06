import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type State = "verifying" | "success" | "failed";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [state, setState] = useState<State>("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const [productInfo, setProductInfo] = useState<{ productType: string; productId: string } | null>(null);

  const orderId = searchParams.get("orderId") ?? "";

  useEffect(() => {
    const run = async () => {
      const paymentKey = searchParams.get("paymentKey");
      const amount = searchParams.get("amount");
      if (!orderId || !paymentKey || !amount) {
        setState("failed");
        setErrorMsg("필수 파라미터 누락");
        return;
      }
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { orderId, paymentKey, amount: Number(amount) },
      });
      if (error || !data) {
        setState("failed");
        setErrorMsg(error?.message ?? "검증 실패");
        return;
      }
      if (data.status === "completed" || data.status === "already_completed") {
        setProductInfo({ productType: data.productType, productId: data.productId });
        setState("success");
      } else {
        setState("failed");
        setErrorMsg(data.error ?? data.code ?? "알 수 없는 상태");
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="items-center text-center">
          {state === "verifying" && (
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-2">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
          )}
          {state === "success" && (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
          )}
          {state === "failed" && (
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
          )}
          <CardTitle>
            {state === "verifying" && "결제를 확인하고 있어요..."}
            {state === "success" && "결제 완료!"}
            {state === "failed" && "결제 검증 실패"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {orderId && (
            <div className="rounded-xl border bg-card p-3 text-xs flex justify-between">
              <span className="text-muted-foreground">주문번호</span>
              <span className="font-mono truncate ml-2">{orderId}</span>
            </div>
          )}

          {state === "success" && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                검사를 시작할 수 있어요.
              </p>
              <Button
                className="w-full"
                size="lg"
                onClick={() =>
                  productInfo && productInfo.productType === "single_test"
                    ? navigate(`/tests/${productInfo.productId}`)
                    : navigate("/tests")
                }
              >
                검사 시작하기
              </Button>
            </>
          )}

          {state === "failed" && (
            <>
              <p className="text-sm text-destructive text-center">{errorMsg}</p>
              <p className="text-xs text-muted-foreground text-center">
                문제가 지속되면 고객센터로 문의해주세요.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/tests")}>
                검사 목록으로
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}