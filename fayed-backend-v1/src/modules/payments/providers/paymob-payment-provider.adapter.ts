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

type PaymobAuthTokenResponse = {
  token?: string;
};

type PaymobCreateOrderResponse = {
  id?: number;
  merchant_order_id?: string;
};

type PaymobPaymentKeyResponse = {
  token?: string;
};

type PaymobWebhookEvent = {
  id?: number;
  success?: boolean;
  pending?: boolean;
  order?: {
    id?: number;
    merchant_order_id?: string;
  };
  amount_cents?: number;
  created_at?: string;
  currency?: string;
  error_occured?: boolean;
  has_parent_transaction?: boolean;
  integration_id?: number;
  is_3d_secure?: boolean;
  is_auth?: boolean;
  is_capture?: boolean;
  is_refunded?: boolean;
  is_standalone_payment?: boolean;
  is_voided?: boolean;
  owner?: number;
  source_data?: {
    pan?: string;
    sub_type?: string;
    type?: string;
  };
};

type PaymobRefundResponse = {
  id?: number;
  pending?: boolean;
  success?: boolean;
};

@Injectable()
export class PaymobPaymentProviderAdapter implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.PAYMOB;

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
      PaymentProvider.PAYMOB,
    );
    const paymobConfig = this.paymentRuntimeConfigService.getPaymobConfig();
    const paymobBaseUrl = paymobConfig.baseUrl!;
    const paymobIframeId = paymobConfig.iframeId!;

    const authToken = await this.createAuthToken();
    const createdOrder = await this.createOrder({
      authToken,
      paymentId: input.paymentId,
      amountMinor: input.amountMinor,
      currency: input.currency,
    });
    const paymentToken = await this.createPaymentKey({
      authToken,
      orderId: createdOrder.id,
      amountMinor: input.amountMinor,
      currency: input.currency,
      patientEmail: input.patientEmail ?? null,
    });

    return {
      providerPaymentRef: String(createdOrder.id),
      providerOrderRef: String(createdOrder.id),
      status: PaymentStatus.PENDING,
      checkoutUrl: `${paymobBaseUrl}/acceptance/iframes/${paymobIframeId}?payment_token=${paymentToken}`,
      metadata: {
        paymobMerchantOrderId: createdOrder.merchantOrderId,
      },
    };
  }

  parseAndVerifyWebhook(input: {
    rawBody: Buffer;
    headers: Record<string, string | string[] | undefined>;
    query?: Record<string, unknown>;
  }): PaymentWebhookResult {
    this.paymentRuntimeConfigService.assertWebhookConfigured(
      PaymentProvider.PAYMOB,
    );

    const receivedHmac = this.resolveHmacSignature({
      headers: input.headers,
      query: input.query ?? {},
    });

    if (!receivedHmac) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidWebhookSignature',
        error: 'PAYMENT_INVALID_WEBHOOK_SIGNATURE',
      });
    }

    const event = this.parseWebhookPayload(input.rawBody);
    const expectedHmac = this.buildWebhookHmac(event);

    if (!this.constantTimeEqual(expectedHmac, receivedHmac.toLowerCase())) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidWebhookSignature',
        error: 'PAYMENT_INVALID_WEBHOOK_SIGNATURE',
      });
    }

    const providerPaymentRef = event.order?.id
      ? String(event.order.id)
      : event.order?.merchant_order_id?.trim() || null;

    if (!providerPaymentRef || !event.id) {
      return { handled: false };
    }

    const outcome = this.mapWebhookOutcome(event);

    if (!outcome) {
      return { handled: false };
    }

    return {
      handled: true,
      providerEventRef: `paymob:${event.id}`,
      providerPaymentRef,
      outcome,
      payload: event as unknown as Record<string, unknown>,
    };
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
    this.paymentRuntimeConfigService.assertCheckoutConfigured(
      PaymentProvider.PAYMOB,
    );
    const paymobConfig = this.paymentRuntimeConfigService.getPaymobConfig();
    const paymobBaseUrl = paymobConfig.baseUrl!;

    const transactionId = input.providerTransactionRef?.trim();
    if (!transactionId) {
      throw new BadRequestException({
        messageKey: 'payments.errors.providerReferenceMissing',
        error: 'PAYMENT_PROVIDER_REFERENCE_MISSING',
        messageParams: {
          provider: PaymentProvider.PAYMOB,
        },
      });
    }

    const authToken = await this.createAuthToken();

    const response = await fetch(
      `${paymobBaseUrl}/acceptance/void_refund/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_token: authToken,
          transaction_id: transactionId,
          amount_cents: String(input.amountMinor),
        }),
      },
    );

    if (!response.ok) {
      return {
        providerRefundRef: null,
        outcome: 'FAILED',
      };
    }

    const payload = (await response.json()) as PaymobRefundResponse;
    const outcome =
      payload.success === true
        ? 'SUCCEEDED'
        : payload.pending
          ? 'PROCESSING'
          : 'FAILED';

    return {
      providerRefundRef: payload.id ? String(payload.id) : null,
      outcome,
      metadata: {
        paymobRefundPending: Boolean(payload.pending),
        paymobRefundSuccess: Boolean(payload.success),
      },
    };
  }

  private async createAuthToken(): Promise<string> {
    const paymobConfig = this.paymentRuntimeConfigService.getPaymobConfig();
    const paymobBaseUrl = paymobConfig.baseUrl!;

    const response = await fetch(`${paymobBaseUrl}/auth/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: paymobConfig.apiKey,
      }),
    });

    if (!response.ok) {
      throw this.providerInitFailed();
    }

    const payload = (await response.json()) as PaymobAuthTokenResponse;
    const token = payload.token?.trim();

    if (!token) {
      throw this.providerInitFailed();
    }

    return token;
  }

  private async createOrder(input: {
    authToken: string;
    paymentId: string;
    amountMinor: number;
    currency: string;
  }): Promise<{ id: number; merchantOrderId: string }> {
    const paymobConfig = this.paymentRuntimeConfigService.getPaymobConfig();
    const paymobBaseUrl = paymobConfig.baseUrl!;

    const response = await fetch(`${paymobBaseUrl}/ecommerce/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_token: input.authToken,
        delivery_needed: false,
        amount_cents: String(input.amountMinor),
        currency: input.currency.toUpperCase(),
        merchant_order_id: input.paymentId,
        items: [],
      }),
    });

    if (!response.ok) {
      throw this.providerInitFailed();
    }

    const payload = (await response.json()) as PaymobCreateOrderResponse;

    if (!payload.id || !payload.merchant_order_id?.trim()) {
      throw this.providerInitFailed();
    }

    return {
      id: payload.id,
      merchantOrderId: payload.merchant_order_id.trim(),
    };
  }

  private async createPaymentKey(input: {
    authToken: string;
    orderId: number;
    amountMinor: number;
    currency: string;
    patientEmail: string | null;
  }): Promise<string> {
    const paymobConfig = this.paymentRuntimeConfigService.getPaymobConfig();
    const paymobBaseUrl = paymobConfig.baseUrl!;
    const integrationIdCard = paymobConfig.integrationIdCard!;

    const response = await fetch(`${paymobBaseUrl}/acceptance/payment_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_token: input.authToken,
        amount_cents: String(input.amountMinor),
        expiration: 3600,
        order_id: input.orderId,
        billing_data: this.buildBillingData(input.patientEmail),
        currency: input.currency.toUpperCase(),
        integration_id: Number(integrationIdCard),
      }),
    });

    if (!response.ok) {
      throw this.providerInitFailed();
    }

    const payload = (await response.json()) as PaymobPaymentKeyResponse;
    const token = payload.token?.trim();

    if (!token) {
      throw this.providerInitFailed();
    }

    return token;
  }

  private buildBillingData(
    patientEmail: string | null,
  ): Record<string, string> {
    return {
      apartment: 'NA',
      email: patientEmail?.trim() || 'no-email@fayed.local',
      floor: 'NA',
      first_name: 'Fayed',
      street: 'NA',
      building: 'NA',
      phone_number: 'NA',
      shipping_method: 'NA',
      postal_code: 'NA',
      city: 'NA',
      country: 'EG',
      last_name: 'Patient',
      state: 'NA',
    };
  }

  private parseWebhookPayload(rawBody: Buffer): PaymobWebhookEvent {
    try {
      return JSON.parse(rawBody.toString('utf8')) as PaymobWebhookEvent;
    } catch {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidWebhookPayload',
        error: 'PAYMENT_INVALID_WEBHOOK_PAYLOAD',
      });
    }
  }

  private resolveHmacSignature(input: {
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, unknown>;
  }): string | null {
    const headerCandidates = ['x-paymob-hmac', 'hmac', 'x-hmac'];

    for (const headerKey of headerCandidates) {
      const raw = input.headers[headerKey];
      const value = Array.isArray(raw) ? raw[0] : raw;

      if (value?.trim()) {
        return value.trim();
      }
    }

    const queryHmac = input.query.hmac;
    if (typeof queryHmac === 'string' && queryHmac.trim()) {
      return queryHmac.trim();
    }

    return null;
  }

  private buildWebhookHmac(event: PaymobWebhookEvent): string {
    const hmacSecret =
      this.paymentRuntimeConfigService.getPaymobConfig().hmacSecret;

    if (!hmacSecret) {
      throw new ServiceUnavailableException({
        messageKey: 'payments.errors.providerWebhookNotConfigured',
        error: 'PAYMENT_PROVIDER_WEBHOOK_NOT_CONFIGURED',
        messageParams: {
          provider: PaymentProvider.PAYMOB,
        },
      });
    }

    const concatenated = [
      this.toStringValue(event.amount_cents),
      this.toStringValue(event.created_at),
      this.toStringValue(event.currency),
      this.toBooleanString(event.error_occured),
      this.toBooleanString(event.has_parent_transaction),
      this.toStringValue(event.id),
      this.toStringValue(event.integration_id),
      this.toBooleanString(event.is_3d_secure),
      this.toBooleanString(event.is_auth),
      this.toBooleanString(event.is_capture),
      this.toBooleanString(event.is_refunded),
      this.toBooleanString(event.is_standalone_payment),
      this.toBooleanString(event.is_voided),
      this.toStringValue(event.order?.id),
      this.toStringValue(event.owner),
      this.toBooleanString(event.pending),
      this.toStringValue(event.source_data?.pan),
      this.toStringValue(event.source_data?.sub_type),
      this.toStringValue(event.source_data?.type),
      this.toBooleanString(event.success),
    ].join('');

    return createHmac('sha512', hmacSecret)
      .update(concatenated)
      .digest('hex')
      .toLowerCase();
  }

  private mapWebhookOutcome(
    event: PaymobWebhookEvent,
  ): 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | null {
    if (event.success === true) {
      return 'SUCCEEDED';
    }

    if (event.pending === true) {
      return null;
    }

    if (event.is_voided === true) {
      return 'EXPIRED';
    }

    if (event.success === false || event.error_occured === true) {
      return 'FAILED';
    }

    return null;
  }

  private toStringValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }

  private toBooleanString(value: unknown): string {
    return value ? 'true' : 'false';
  }

  private constantTimeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private providerInitFailed(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      messageKey: 'payments.errors.providerInitializationFailed',
      error: 'PAYMENT_PROVIDER_INITIALIZATION_FAILED',
      messageParams: {
        provider: PaymentProvider.PAYMOB,
      },
    });
  }
}
