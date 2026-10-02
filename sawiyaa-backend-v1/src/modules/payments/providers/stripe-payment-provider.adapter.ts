import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import {
  PaymentProviderAdapter,
  PaymentProviderInitiationResult,
  PaymentProviderReconciliationResult,
  PaymentProviderRefundResult,
  PaymentWebhookResult,
} from './payment-provider-adapter.interface';
import { PaymentRuntimeConfigService } from '../services/payment-runtime-config.service';

type StripePaymentIntentResponse = {
  id: string;
  status: string;
  amount?: number;
  amount_received?: number;
  currency?: string;
  client_secret?: string | null;
  metadata?: Record<string, string>;
};

type StripeWebhookEvent = {
  id: string;
  type: string;
  data?: {
    object?: {
      id?: string;
      amount?: number;
      amount_received?: number;
      currency?: string;
      metadata?: Record<string, string>;
    };
  };
};

type StripeRefundResponse = {
  id: string;
  status: string;
  amount?: number;
  currency?: string;
  payment_intent?: string | null;
  metadata?: Record<string, string>;
};

type StripeSearchResponse<T> = { data?: T[] };

@Injectable()
export class StripePaymentProviderAdapter implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.STRIPE;

  constructor(
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
  ) {}

  async initiateSessionPayment(input: {
    paymentId: string;
    amountMinor: number;
    currency: string;
    description: string;
    sessionId: string;
    patientEmail?: string | null;
  }): Promise<PaymentProviderInitiationResult> {
    this.paymentRuntimeConfigService.assertCheckoutConfigured(
      PaymentProvider.STRIPE,
    );
    const stripeConfig = this.paymentRuntimeConfigService.getStripeConfig();
    const stripeApiBaseUrl = stripeConfig.apiBaseUrl!;

    const form = new URLSearchParams();
    form.set('amount', String(input.amountMinor));
    form.set('currency', input.currency.toLowerCase());
    form.set('description', input.description);
    form.set('metadata[paymentId]', input.paymentId);
    form.set('metadata[sessionId]', input.sessionId);
    form.set('automatic_payment_methods[enabled]', 'true');

    if (input.patientEmail?.trim()) {
      form.set('receipt_email', input.patientEmail.trim());
    }

    const response = await fetch(`${stripeApiBaseUrl}/v1/payment_intents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeConfig.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `payment:${input.paymentId}`,
      },
      body: form.toString(),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException({
        messageKey: 'payments.errors.providerInitializationFailed',
        error: 'PAYMENT_PROVIDER_INITIALIZATION_FAILED',
        messageParams: {
          provider: PaymentProvider.STRIPE,
        },
      });
    }

    const payload = (await response.json()) as StripePaymentIntentResponse;

    return {
      providerPaymentRef: payload.id,
      status: this.mapIntentStatusToPaymentStatus(payload.status),
      clientSecret: payload.client_secret ?? null,
      metadata: {
        stripeIntentStatus: payload.status,
      },
    };
  }

  async reconcilePayment(input: {
    paymentId: string;
    providerPaymentRef: string | null;
    providerOrderRef: string | null;
    amountMinor: number;
    currency: string;
  }): Promise<PaymentProviderReconciliationResult> {
    const stripeConfig = this.paymentRuntimeConfigService.getStripeConfig();
    const base = stripeConfig.apiBaseUrl!;
    const url = input.providerPaymentRef
      ? `${base}/v1/payment_intents/${encodeURIComponent(input.providerPaymentRef)}`
      : `${base}/v1/payment_intents/search?${new URLSearchParams({ query: `metadata['paymentId']:'${input.paymentId}'`, limit: '2' }).toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${stripeConfig.secretKey}` },
    });
    if (response.status === 404)
      return {
        outcome: 'NOT_FOUND',
        evidence: { source: 'stripe-payment-intent-query', httpStatus: 404 },
      };
    if (!response.ok)
      return {
        outcome: 'UNKNOWN',
        evidence: {
          source: 'stripe-payment-intent-query',
          httpStatus: response.status,
        },
      };
    const body = (await response.json()) as
      | StripePaymentIntentResponse
      | StripeSearchResponse<StripePaymentIntentResponse>;
    const matches: StripePaymentIntentResponse[] = Array.isArray(
      (body as StripeSearchResponse<StripePaymentIntentResponse>).data,
    )
      ? (body as StripeSearchResponse<StripePaymentIntentResponse>).data!
      : [body as StripePaymentIntentResponse];
    const intent =
      matches.find((item) => item.metadata?.paymentId === input.paymentId) ??
      (input.providerPaymentRef ? matches[0] : null);
    if (!intent)
      return {
        outcome: 'NOT_FOUND',
        evidence: {
          source: 'stripe-payment-intent-query',
          matchCount: matches.length,
        },
      };
    return {
      outcome: this.mapProviderStatus(intent.status),
      providerPaymentRef: intent.id,
      amountMinor: intent.amount_received ?? intent.amount ?? null,
      currencyCode: intent.currency?.toUpperCase() ?? null,
      clientSecret: intent.client_secret ?? null,
      evidence: {
        source: 'stripe-payment-intent-query',
        stripeStatus: intent.status,
      },
    };
  }

  async reconcileRefund(input: {
    refundId: string;
    paymentId: string;
    providerPaymentRef: string | null;
    providerOrderRef: string | null;
    providerTransactionRef?: string | null;
    providerRefundRef: string | null;
    amountMinor: number;
    priorSucceededRefundMinor: number;
    currency: string;
  }): Promise<PaymentProviderReconciliationResult> {
    const stripeConfig = this.paymentRuntimeConfigService.getStripeConfig();
    const base = stripeConfig.apiBaseUrl!;
    if (!input.providerRefundRef && !input.providerPaymentRef)
      return {
        outcome: 'UNKNOWN',
        evidence: {
          source: 'stripe-refund-query',
          reason: 'missing-provider-reference',
        },
      };
    const url = input.providerRefundRef
      ? `${base}/v1/refunds/${encodeURIComponent(input.providerRefundRef)}`
      : `${base}/v1/refunds?${new URLSearchParams({ payment_intent: input.providerPaymentRef!, limit: '100' }).toString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${stripeConfig.secretKey}` },
    });
    if (response.status === 404)
      return {
        outcome: 'NOT_FOUND',
        evidence: { source: 'stripe-refund-query', httpStatus: 404 },
      };
    if (!response.ok)
      return {
        outcome: 'UNKNOWN',
        evidence: {
          source: 'stripe-refund-query',
          httpStatus: response.status,
        },
      };
    const body = (await response.json()) as
      | StripeRefundResponse
      | StripeSearchResponse<StripeRefundResponse>;
    const matches: StripeRefundResponse[] = Array.isArray(
      (body as StripeSearchResponse<StripeRefundResponse>).data,
    )
      ? (body as StripeSearchResponse<StripeRefundResponse>).data!
      : [body as StripeRefundResponse];
    const refund =
      matches.find((item) => item.metadata?.refundId === input.refundId) ??
      (input.providerRefundRef ? matches[0] : null);
    if (!refund)
      return {
        outcome: 'NOT_FOUND',
        evidence: { source: 'stripe-refund-query', matchCount: matches.length },
      };
    return {
      outcome: this.mapProviderStatus(refund.status),
      providerRefundRef: refund.id,
      providerPaymentRef: refund.payment_intent ?? input.providerPaymentRef,
      amountMinor: refund.amount ?? null,
      currencyCode: refund.currency?.toUpperCase() ?? null,
      evidence: { source: 'stripe-refund-query', stripeStatus: refund.status },
    };
  }

  parseAndVerifyWebhook(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
    query?: Record<string, unknown>;
  }): PaymentWebhookResult {
    this.paymentRuntimeConfigService.assertWebhookConfigured(
      PaymentProvider.STRIPE,
    );
    const stripeConfig = this.paymentRuntimeConfigService.getStripeConfig();

    const signatureHeader = input.headers['stripe-signature'];
    const signatureValue = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;

    if (!signatureValue) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidWebhookSignature',
        error: 'PAYMENT_INVALID_WEBHOOK_SIGNATURE',
      });
    }

    const parsed = this.parseStripeSignature(signatureValue);
    const signedPayload = `${parsed.timestamp}.${input.rawBody.toString('utf8')}`;
    const expected = createHmac('sha256', stripeConfig.webhookSecret!)
      .update(signedPayload)
      .digest('hex');

    if (!this.constantTimeEqual(expected, parsed.v1)) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidWebhookSignature',
        error: 'PAYMENT_INVALID_WEBHOOK_SIGNATURE',
      });
    }

    const event = JSON.parse(
      input.rawBody.toString('utf8'),
    ) as StripeWebhookEvent;

    const stripeObject = event.data?.object;
    const providerPaymentRef = stripeObject?.id;

    if (!event.id || !providerPaymentRef) {
      return { handled: false };
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        return {
          handled: true,
          providerEventRef: event.id,
          providerPaymentRef,
          outcome: 'SUCCEEDED',
          amountMinor:
            stripeObject?.amount_received ?? stripeObject?.amount ?? null,
          currencyCode: stripeObject?.currency ?? null,
          payload: event as unknown as Record<string, unknown>,
        };
      case 'payment_intent.payment_failed':
        return {
          handled: true,
          providerEventRef: event.id,
          providerPaymentRef,
          outcome: 'FAILED',
          amountMinor: stripeObject?.amount ?? null,
          currencyCode: stripeObject?.currency ?? null,
          payload: event as unknown as Record<string, unknown>,
        };
      case 'payment_intent.canceled':
        return {
          handled: true,
          providerEventRef: event.id,
          providerPaymentRef,
          outcome: 'EXPIRED',
          amountMinor: stripeObject?.amount ?? null,
          currencyCode: stripeObject?.currency ?? null,
          payload: event as unknown as Record<string, unknown>,
        };
      default:
        return { handled: false };
    }
  }

  async refundPayment(input: {
    refundId: string;
    paymentId: string;
    providerPaymentRef: string | null;
    providerOrderRef: string | null;
    providerTransactionRef?: string | null;
    amountMinor: number;
    currency: string;
    reason?: string | null;
  }): Promise<PaymentProviderRefundResult> {
    this.paymentRuntimeConfigService.assertCheckoutConfigured(
      PaymentProvider.STRIPE,
    );
    const stripeConfig = this.paymentRuntimeConfigService.getStripeConfig();
    const stripeApiBaseUrl = stripeConfig.apiBaseUrl!;

    if (!input.providerPaymentRef?.trim()) {
      throw new BadRequestException({
        messageKey: 'payments.errors.providerReferenceMissing',
        error: 'PAYMENT_PROVIDER_REFERENCE_MISSING',
        messageParams: {
          provider: PaymentProvider.STRIPE,
        },
      });
    }

    const form = new URLSearchParams();
    form.set('payment_intent', input.providerPaymentRef);
    form.set('amount', String(input.amountMinor));
    if (input.reason?.trim()) {
      form.set('metadata[refundReason]', input.reason.trim());
    }
    form.set('metadata[paymentId]', input.paymentId);
    form.set('metadata[refundId]', input.refundId);

    const response = await fetch(`${stripeApiBaseUrl}/v1/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeConfig.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `refund:${input.refundId}`,
      },
      body: form.toString(),
    });

    if (!response.ok) {
      return {
        providerRefundRef: null,
        outcome: 'FAILED',
      };
    }

    const payload = (await response.json()) as StripeRefundResponse;
    const mapped = this.mapRefundOutcome(payload.status);

    return {
      providerRefundRef: payload.id ?? null,
      outcome: mapped,
      metadata: {
        stripeRefundStatus: payload.status,
      },
    };
  }

  private parseStripeSignature(signature: string): {
    timestamp: string;
    v1: string;
  } {
    const parts = signature.split(',');
    const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
    const v1 = parts.find((part) => part.startsWith('v1='))?.slice(3);

    if (!timestamp || !v1) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidWebhookSignature',
        error: 'PAYMENT_INVALID_WEBHOOK_SIGNATURE',
      });
    }

    return { timestamp, v1 };
  }

  private constantTimeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private mapIntentStatusToPaymentStatus(status: string): PaymentStatus {
    switch (status) {
      case 'succeeded':
        return PaymentStatus.CAPTURED;
      case 'requires_action':
        return PaymentStatus.REQUIRES_ACTION;
      case 'requires_capture':
        return PaymentStatus.AUTHORIZED;
      case 'processing':
      case 'requires_payment_method':
      default:
        return PaymentStatus.PENDING;
    }
  }

  private mapRefundOutcome(
    status: string,
  ): PaymentProviderRefundResult['outcome'] {
    switch (status) {
      case 'succeeded':
        return 'SUCCEEDED';
      case 'pending':
      case 'requires_action':
        return 'PROCESSING';
      case 'failed':
      case 'canceled':
      default:
        return 'FAILED';
    }
  }

  private mapProviderStatus(
    status: string,
  ): PaymentProviderReconciliationResult['outcome'] {
    if (status === 'succeeded') return 'SUCCEEDED';
    if (status === 'requires_capture') return 'AUTHORIZED';
    if (
      [
        'processing',
        'pending',
        'requires_action',
        'requires_confirmation',
        'requires_payment_method',
      ].includes(status)
    )
      return 'PROCESSING';
    if (['failed', 'canceled'].includes(status)) return 'FAILED';
    return 'UNKNOWN';
  }
}
