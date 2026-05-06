export type PaymentProductType = 'single_test' | 'pro_subscription';

export interface RequestPaymentParams {
  orderId: string;
  amount: number;
  productType: PaymentProductType;
  productId: string;
  productName: string;
  userEmail?: string;
}

export interface PaymentResult {
  status: 'success' | 'fail' | 'cancel';
  orderId: string;
  paymentKey?: string;
  errorCode?: string;
  errorMessage?: string;
}