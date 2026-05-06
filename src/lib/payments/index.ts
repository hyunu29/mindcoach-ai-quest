import { PaymentProvider } from './provider';
import { MockPaymentProvider } from './mock-provider';

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  // 향후 env로 분기: VITE_PAYMENT_PROVIDER === 'toss' → TossProvider
  cached = new MockPaymentProvider();
  return cached;
}

export type { PaymentProvider } from './provider';
export type { RequestPaymentParams, PaymentResult, PaymentProductType } from './types';