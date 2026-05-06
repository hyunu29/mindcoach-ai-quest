import { PaymentProvider } from './provider';
import { RequestPaymentParams } from './types';

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async requestPayment(params: RequestPaymentParams): Promise<void> {
    const query = new URLSearchParams({
      orderId: params.orderId,
      amount: String(params.amount),
      productName: params.productName,
      productType: params.productType,
      productId: params.productId,
    });
    window.location.href = `/payment/mock?${query.toString()}`;
  }
}