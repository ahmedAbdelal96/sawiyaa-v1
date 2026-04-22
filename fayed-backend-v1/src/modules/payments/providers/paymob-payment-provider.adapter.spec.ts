import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PaymobPaymentProviderAdapter } from './paymob-payment-provider.adapter';

describe('PaymobPaymentProviderAdapter', () => {
  const baseConfig = {
    enabled: true,
    mode: 'test' as const,
    apiKey: 'paymob_api',
    hmacSecret: 'paymob_hmac',
    baseUrl: 'https://accept.paymob.com/api',
    integrationIdCard: '12345',
    integrationIdWallet: null,
    iframeId: '7777',
  };

  const buildAdapter = (overrides?: Partial<typeof baseConfig>) => {
    const paymobConfig = { ...baseConfig, ...(overrides ?? {}) };
    return new PaymobPaymentProviderAdapter({
      getPaymobConfig: () => paymobConfig,
      assertCheckoutConfigured: (provider: PaymentProvider) => {
        if (
          provider === PaymentProvider.PAYMOB &&
          (!paymobConfig.apiKey ||
            !paymobConfig.integrationIdCard ||
            !paymobConfig.iframeId)
        ) {
          throw new ServiceUnavailableException();
        }
      },
      assertWebhookConfigured: (provider: PaymentProvider) => {
        if (provider === PaymentProvider.PAYMOB && !paymobConfig.hmacSecret) {
          throw new ServiceUnavailableException();
        }
      },
    } as never);
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('initiates a paymob checkout successfully', async () => {
    const adapter = buildAdapter();
    const fetchMock = jest
      .spyOn(global, 'fetch' as never)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'auth_token' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 111, merchant_order_id: 'payment_123' }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'payment_token' }), {
          status: 200,
        }),
      );

    const result = await adapter.initiateSessionPayment({
      paymentId: 'payment_123',
      amountMinor: 150000,
      currency: 'EGP',
      description: 'Session payment',
      sessionId: 'session_1',
      patientEmail: 'test@fayed.local',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.providerPaymentRef).toBe('111');
    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(result.checkoutUrl).toContain('/acceptance/iframes/7777');
    expect(result.checkoutUrl).toContain('payment_token=payment_token');
  });

  it('fails clearly when initiation config is missing', async () => {
    const adapter = buildAdapter({ apiKey: '' });

    await expect(
      adapter.initiateSessionPayment({
        paymentId: 'payment_123',
        amountMinor: 50000,
        currency: 'EGP',
        description: 'Session payment',
        sessionId: 'session_1',
        patientEmail: null,
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('fails webhook verification on invalid signature', () => {
    const adapter = buildAdapter();
    const event = buildWebhookEvent({
      id: 9001,
      orderId: 777,
      success: true,
      pending: false,
    });
    const rawBody = Buffer.from(JSON.stringify(event));

    expect(() =>
      adapter.parseAndVerifyWebhook({
        rawBody,
        headers: {},
        query: {
          hmac: 'invalid_signature',
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('parses verified webhook and maps succeeded outcome', () => {
    const adapter = buildAdapter();
    const event = buildWebhookEvent({
      id: 9001,
      orderId: 777,
      success: true,
      pending: false,
    });
    const rawBody = Buffer.from(JSON.stringify(event));
    const hmac = buildPaymobHmac(event, baseConfig.hmacSecret);

    const webhook = adapter.parseAndVerifyWebhook({
      rawBody,
      headers: {},
      query: { hmac },
    });

    expect(webhook.handled).toBe(true);
    if (webhook.handled) {
      expect(webhook.providerEventRef).toBe('paymob:9001');
      expect(webhook.providerPaymentRef).toBe('777');
      expect(webhook.outcome).toBe('SUCCEEDED');
    }
  });

  it('rejects malformed webhook payload', () => {
    const adapter = buildAdapter();

    expect(() =>
      adapter.parseAndVerifyWebhook({
        rawBody: Buffer.from('not-json'),
        headers: {},
        query: { hmac: 'x' },
      }),
    ).toThrow(BadRequestException);
  });
});

function buildWebhookEvent(input: {
  id: number;
  orderId: number;
  success: boolean;
  pending: boolean;
}) {
  return {
    amount_cents: 150000,
    created_at: '2026-03-31T10:00:00.000000',
    currency: 'EGP',
    error_occured: false,
    has_parent_transaction: false,
    id: input.id,
    integration_id: 12345,
    is_3d_secure: false,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: {
      id: input.orderId,
      merchant_order_id: 'payment_123',
    },
    owner: 999,
    pending: input.pending,
    source_data: {
      pan: '****1111',
      sub_type: 'mastercard',
      type: 'card',
    },
    success: input.success,
  };
}

function buildPaymobHmac(
  event: Record<string, unknown>,
  secret: string,
): string {
  const sourceData = (event.source_data as Record<string, unknown>) ?? {};
  const order = (event.order as Record<string, unknown>) ?? {};
  const concatenated = [
    toStringValue(event.amount_cents),
    toStringValue(event.created_at),
    toStringValue(event.currency),
    toBooleanString(event.error_occured),
    toBooleanString(event.has_parent_transaction),
    toStringValue(event.id),
    toStringValue(event.integration_id),
    toBooleanString(event.is_3d_secure),
    toBooleanString(event.is_auth),
    toBooleanString(event.is_capture),
    toBooleanString(event.is_refunded),
    toBooleanString(event.is_standalone_payment),
    toBooleanString(event.is_voided),
    toStringValue(order.id),
    toStringValue(event.owner),
    toBooleanString(event.pending),
    toStringValue(sourceData.pan),
    toStringValue(sourceData.sub_type),
    toStringValue(sourceData.type),
    toBooleanString(event.success),
  ].join('');

  return createHmac('sha512', secret).update(concatenated).digest('hex');
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function toBooleanString(value: unknown): string {
  return value ? 'true' : 'false';
}
