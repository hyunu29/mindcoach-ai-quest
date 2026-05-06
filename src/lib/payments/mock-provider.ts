import { supabase } from '@/integrations/supabase/client';
import { PaymentProvider } from './provider';
import { RequestPaymentParams } from './types';

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  // ⚠️ params.amount/orderId는 무시됨 — 서버(create-payment-order)가 결정.
  async requestPayment(params: RequestPaymentParams): Promise<void> {
    const { data, error } = await supabase.functions.invoke('create-payment-order', {
      body: { productType: params.productType, productId: params.productId },
    });
    if (error || !data?.orderId) {
      alert('결제 주문 생성 실패: ' + (error?.message ?? 'unknown'));
      return;
    }
    const query = new URLSearchParams({
      orderId: data.orderId,
      amount: String(data.amount),
      productName: data.productName ?? params.productName,
      productType: params.productType,
      productId: params.productId,
    });
    window.location.href = `/payment/mock?${query.toString()}`;
  }
}