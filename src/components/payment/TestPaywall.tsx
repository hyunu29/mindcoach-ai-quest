import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Clock, UserCircle2, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePurchase } from '@/hooks/usePurchase';
import type { AccessReason } from '@/hooks/useTestAccessCheck';

interface TestPaywallProps {
  testSlug: string;
  testName: string;
  reason: AccessReason;
  expiresAt?: string;
}

const PRICE = 2900;

export function TestPaywall({ testSlug, testName, reason, expiresAt }: TestPaywallProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { purchase, loadingId } = usePurchase();

  const handlePurchase = () => {
    purchase({ productType: 'single_test', productId: testSlug, productName: testName });
  };

  const handleLogin = () => {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    navigate(`/auth?returnUrl=${returnUrl}`);
  };

  const expiredDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '';

  const isPurchasing = loadingId === testSlug;

  return (
    <div className="flex items-center justify-center py-8 px-4 animate-fade-in">
      <Card className="w-full max-w-md rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="items-center text-center space-y-3">
          {reason === 'never_purchased' && (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-primary" />
            </div>
          )}
          {reason === 'expired' && (
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
          )}
          {reason === 'not_logged_in' && (
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <UserCircle2 className="w-7 h-7 text-muted-foreground" />
            </div>
          )}
          <CardTitle className="text-base">{testName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          {reason === 'never_purchased' && (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {testName}는 단품 결제 후<br />
                <span className="font-semibold text-foreground">30일간 자유롭게 응시</span>할 수 있어요.
              </p>
              <div className="rounded-xl bg-muted/50 py-3">
                <span className="text-2xl font-bold text-primary">₩{PRICE.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground ml-1">/ 30일 이용권</span>
              </div>
              <Button
                className="w-full rounded-xl gradient-primary text-primary-foreground"
                onClick={handlePurchase}
                disabled={isPurchasing}
              >
                {isPurchasing ? '결제 페이지로 이동 중...' : '구매하기'}
              </Button>
            </>
          )}
          {reason === 'expired' && (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                이전 구매가 <span className="font-semibold text-foreground">{expiredDate}</span>에 만료되었어요.
                <br />
                다시 30일 이용권을 구매하시겠어요?
              </p>
              <div className="rounded-xl bg-muted/50 py-3">
                <span className="text-2xl font-bold text-primary">₩{PRICE.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground ml-1">/ 30일 이용권</span>
              </div>
              <Button
                className="w-full rounded-xl gradient-primary text-primary-foreground"
                onClick={handlePurchase}
                disabled={isPurchasing}
              >
                {isPurchasing ? '결제 페이지로 이동 중...' : '재구매하기'}
              </Button>
            </>
          )}
          {reason === 'not_logged_in' && (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                검사 응시는 로그인 후 이용할 수 있어요.
              </p>
              <Button
                className="w-full rounded-xl gradient-primary text-primary-foreground"
                onClick={handleLogin}
              >
                로그인하기
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mx-auto"
          >
            가격 페이지에서 다른 검사도 보기
            <ArrowRight className="w-3 h-3" />
          </button>
        </CardContent>
      </Card>
    </div>
  );
}