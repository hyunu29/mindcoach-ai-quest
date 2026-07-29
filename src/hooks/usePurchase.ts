import { useState } from 'react';
import { getPaymentProvider } from '@/lib/payments';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/analytics';

interface PurchaseArgs {
  productType: 'single_test' | 'pro_subscription' | 'credit_pack';
  productId: string;
  productName: string;
}

export function usePurchase() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const purchase = async (args: PurchaseArgs) => {
    if (loadingId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('로그인이 필요해요', { description: '결제를 진행하려면 먼저 로그인해 주세요.' });
      navigate('/auth');
      return;
    }
    setLoadingId(args.productId);
    try {
      void track('purchase_clicked', { product_type: args.productType, product_id: args.productId });
      const provider = getPaymentProvider();
      await provider.requestPayment({
        orderId: '',
        amount: 0,
        productType: args.productType,
        productId: args.productId,
        productName: args.productName,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요';
      toast.error('결제 시작 실패', { description: msg });
      setLoadingId(null);
    }
  };

  return { purchase, loadingId, isLoading: (id: string) => loadingId === id };
}