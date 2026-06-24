import { PaymentProvider, PaymentStatus } from '@prisma/client';

export type PaymentProviderInitiationResult = {
  providerPaymentRef: string;
  providerOrderRef?: string | null;
  providerCustomerRef?: string | null;
  providerMethod?: string | null;
  status: PaymentStatus;
  checkoutUrl?: string | null;
  clientSecret?: string | null;
  metadata?: Record<string, unknown>;
};

export type PaymentWebhookResult =
  | {
      handled: true;
      providerEventRef: string;
      providerPaymentRef: string;
      outcome: 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
      payload: Record<string, unknown>;
    }
  | {
      handled: false;
    };

export type PaymentProviderRefundResult = {
  providerRefundRef: string | null;
  outcome: 'SUCCEEDED' | 'PROCESSING' | 'FAILED';
  metadata?: Record<string, unknown>;
};

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;

  initiateSessionPayment(input: {
    paymentId: string;
    amountMinor: number;
    currency: string;
    description: string;
    sessionId: string;
    patientEmail?: string | null;
    redirectionUrl?: string | null;
    paymobMethod?: string | null;
    checkoutCountryIsoCode?: string | null;
    operatingCountryIsoCode?: string | null;
  }): Promise<PaymentProviderInitiationResult>;

  refundPayment(input: {
    paymentId: string;
    providerPaymentRef: string | null;
    providerOrderRef: string | null;
    providerTransactionRef?: string | null;
    amountMinor: number;
    currency: string;
    reason?: string | null;
  }): Promise<PaymentProviderRefundResult>;

  parseAndVerifyWebhook(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
    query?: Record<string, unknown>;
  }): PaymentWebhookResult;
}
