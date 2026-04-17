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
  PaymentProviderRefundResult,
  PaymentWebhookResult,
} from './payment-provider-adapter.interface';
import { PaymentRuntimeConfigService } from '../services/payment-runtime-config.service';

type StripePaymentIntentResponse = {
  id: string;
  status: string;
  client_secret?: string | null;
  metadata?: Record<string, string>;
};

type StripeWebhookEvent = {
  id: string;
  type: string;
  data?: {
    object?: {
      id?: string;
      metadata?: Record<string, string>;
    };
  };
};

type StripeRefundResponse = {
  id: string;
  status: string;
};

@Injectable()
export class StripePaymentProviderAdapter implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.STRIPE;

  constructor(private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService) {}

  async initiateSessionPayment(input: {
    paymentId: string;
    amountMinor: number;
    currency: string;
    description: string;
    sessionId: string;
    patientEmail?: string | null;
  }): Promise<PaymentProviderInitiationResult> {
    this.paymentRuntimeConfigService.assertCheckoutConfigured(PaymentProvider.STRIPE);
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

  parseAndVerifyWebhook(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
    query?: Record<string, unknown>;
  }): PaymentWebhookResult {
    this.paymentRuntimeConfigService.assertWebhookConfigured(PaymentProvider.STRIPE);
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

    const event = JSON.parse(input.rawBody.toString('utf8')) as StripeWebhookEvent;

    const providerPaymentRef = event.data?.object?.id;

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
          payload: event as unknown as Record<string, unknown>,
        };
      case 'payment_intent.payment_failed':
        return {
          handled: true,
          providerEventRef: event.id,
          providerPaymentRef,
          outcome: 'FAILED',
          payload: event as unknown as Record<string, unknown>,
        };
      case 'payment_intent.canceled':
        return {
          handled: true,
          providerEventRef: event.id,
          providerPaymentRef,
          outcome: 'EXPIRED',
          payload: event as unknown as Record<string, unknown>,
        };
      default:
        return { handled: false };
    }
  }

  async refundPayment(input: {
    paymentId: string;
    providerPaymentRef: string | null;
    providerOrderRef: string | null;
    providerTransactionRef?: string | null;
    amountMinor: number;
    currency: string;
    reason?: string | null;
  }): Promise<PaymentProviderRefundResult> {
    this.paymentRuntimeConfigService.assertCheckoutConfigured(PaymentProvider.STRIPE);
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

    const response = await fetch(`${stripeApiBaseUrl}/v1/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeConfig.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
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

  private parseStripeSignature(signature: string): { timestamp: string; v1: string } {
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
}
