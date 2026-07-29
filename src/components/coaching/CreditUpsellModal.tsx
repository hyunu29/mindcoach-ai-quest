import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap } from 'lucide-react';
import { usePurchase } from '@/hooks/usePurchase';
import { CREDIT_PACK_DISPLAY } from '@/lib/payments/catalog-display';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreditUpsellModal({ open, onOpenChange }: Props) {
  const { purchase, isLoading } = usePurchase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>크레딧이 모두 소진됐어요</DialogTitle>
          <DialogDescription>
            AI 코칭을 계속하려면 크레딧을 충전하거나 Pro를 구독하세요.
          </DialogDescription>
        </DialogHeader>

        <Card className="p-4 rounded-2xl border-2 border-primary/40 bg-primary/5">
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="w-4 h-4 text-primary" />
            <span className="font-bold">Pro 멤버십</span>
            <Badge className="gradient-primary text-primary-foreground border-0 text-[10px]">추천</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            월 50 크레딧 · ₩9,900{' '}
            <span className="text-primary font-medium">(크레딧당 ₩198 최저가)</span>
          </p>
          <Button
            className="w-full mt-3"
            disabled={isLoading('pro-monthly')}
            onClick={() =>
              purchase({
                productType: 'pro_subscription',
                productId: 'pro-monthly',
                productName: 'Pro 멤버십',
              })
            }
          >
            Pro 구독하기
          </Button>
        </Card>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">또는 크레딧만 충전</p>
          <div className="grid grid-cols-2 gap-2">
            {CREDIT_PACK_DISPLAY.map((p) => (
              <Button
                key={p.productId}
                variant="outline"
                className="h-auto py-3 flex-col gap-0.5"
                disabled={isLoading(p.productId)}
                onClick={() =>
                  purchase({
                    productType: p.productType,
                    productId: p.productId,
                    productName: p.name,
                  })
                }
              >
                <span className="flex items-center gap-1 font-semibold text-sm">
                  <Zap className="w-3.5 h-3.5" /> {p.name.replace('AI ', '')}
                </span>
                <span className="text-xs text-muted-foreground">
                  ₩{p.amount.toLocaleString()}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
