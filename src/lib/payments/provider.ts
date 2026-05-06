import { RequestPaymentParams } from './types';

export interface PaymentProvider {
  readonly name: string;
  requestPayment(params: RequestPaymentParams): Promise<void>;
}