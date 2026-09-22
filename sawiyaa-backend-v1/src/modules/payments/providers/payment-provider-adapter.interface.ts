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
      amountMinor: number | null;
      currencyCode: string | null;
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

export type PaymentProviderReconciliationResult = {
  outcome:
    | 'SUCCEEDED'
    | 'AUTHORIZED'
    | 'PROCESSING'
    | 'FAILED'
    | 'NOT_FOUND'
    | 'UNKNOWN';
  providerPaymentRef?: string | null;
  providerOrderRef?: string | null;
  providerRefundRef?: string | null;
  amountMinor?: number | null;
  currencyCode?: string | null;
  clientSecret?: string | null;
  checkoutUrl?: string | null;
  evidence: Record<string, unknown>;
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
    routeIntegrationKey?: string | null;
    checkoutCountryIsoCode?: string | null;
    operatingCountryIsoCode?: string | null;
  }): Promise<PaymentProviderInitiationResult>;

  refundPayment(input: {
    refundId: string;
    paymentId: string;
    providerPaymentRef: string | null;
    providerOrderRef: string | null;
    providerTransactionRef?: string | null;
    amountMinor: number;
    currency: string;
    reason?: string | null;
  }): Promise<PaymentProviderRefundResult>;

  reconcilePayment(input: {
    paymentId: string;
    providerPaymentRef: string | null;
    providerOrderRef: string | null;
    amountMinor: number;
    currency: string;
  }): Promise<PaymentProviderReconciliationResult>;

  reconcileRefund(input: {
    refundId: string;
    paymentId: string;
    providerPaymentRef: string | null;
    providerOrderRef: string | null;
    providerTransactionRef?: string | null;
    providerRefundRef: string | null;
    amountMinor: number;
    priorSucceededRefundMinor: number;
    currency: string;
  }): Promise<PaymentProviderReconciliationResult>;

  parseAndVerifyWebhook(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
    query?: Record<string, unknown>;
  }): PaymentWebhookResult;
}
