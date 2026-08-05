import { supabase } from '@/integrations/supabase/client';
import { PaymentProvider } from './provider';
import { RequestPaymentParams } from './types';

/**
 * 토스페이먼츠 v2 SDK (결제창 방식).
 * - 주문 생성(create-payment-order)은 서버가 금액을 결정 — 클라 금액 신뢰 안 함
 * - successUrl로 paymentKey/orderId/amount가 붙어 리다이렉트 → PaymentSuccessPage가
 *   verify-payment(서버 승인 API) 호출로 최종 승인
 * - 가맹 계약 전에는 문서 공용 테스트 키로 동작 (실제 청구 없음)
 */

// 토스페이먼츠 공식 문서의 공개 테스트 클라이언트 키 (실제 청구되지 않음)
const DOCS_TEST_CLIENT_KEY = 'test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

const CLIENT_KEY: string =
  (import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined) ?? DOCS_TEST_CLIENT_KEY;

const SDK_SRC = 'https://js.tosspayments.com/v2/standard';

interface TossPaymentsInstance {
  payment: (opts: { customerKey: string }) => {
    requestPayment: (opts: Record<string, unknown>) => Promise<void>;
  };
}

declare global {
  interface Window {
    TossPayments?: ((clientKey: string) => TossPaymentsInstance) & { ANONYMOUS: string };
  }
}

let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (window.TossPayments) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('토스페이먼츠 SDK 로드에 실패했어요. 네트워크를 확인해주세요.'));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export class TossPaymentProvider implements PaymentProvider {
  readonly name = 'toss';

  async requestPayment(params: RequestPaymentParams): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('로그인이 필요해요.');

    // 서버가 상품 검증 + 금액 확정 + payments(pending) 생성
    const { data, error } = await supabase.functions.invoke('create-payment-order', {
      body: { productType: params.productType, productId: params.productId },
    });
    if (error || !data?.orderId) {
      throw new Error('결제 주문 생성에 실패했어요: ' + (error?.message ?? 'unknown'));
    }

    await loadSdk();
    if (!window.TossPayments) throw new Error('토스페이먼츠 SDK를 사용할 수 없어요.');

    const tossPayments = window.TossPayments(CLIENT_KEY);
    const payment = tossPayments.payment({ customerKey: user.id });

    const origin = window.location.origin;
    await payment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: Number(data.amount) },
      orderId: data.orderId,
      orderName: data.productName ?? params.productName,
      successUrl: `${origin}/payment/success`,
      failUrl: `${origin}/payment/fail`,
      customerEmail: user.email ?? undefined,
      card: {
        useEscrow: false,
        flowMode: 'DEFAULT',
        useCardPoint: false,
        useAppCardOnly: false,
      },
    });
    // requestPayment는 결제창으로 리다이렉트하므로 이후 코드는 실행되지 않을 수 있음
  }
}
