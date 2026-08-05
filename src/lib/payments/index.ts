import { PaymentProvider } from './provider';
import { MockPaymentProvider } from './mock-provider';
import { TossPaymentProvider } from './toss-provider';

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  // 기본 = 토스페이먼츠. 개발 시뮬레이터가 필요하면 VITE_PAYMENT_PROVIDER=mock
  cached =
    import.meta.env.VITE_PAYMENT_PROVIDER === 'mock'
      ? new MockPaymentProvider()
      : new TossPaymentProvider();
  return cached;
}

export type { PaymentProvider } from './provider';
export type { RequestPaymentParams, PaymentResult, PaymentProductType } from './types';