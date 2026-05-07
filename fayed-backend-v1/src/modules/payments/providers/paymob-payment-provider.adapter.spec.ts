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
    publicKey: 'public_key',
    hmacSecret: 'paymob_hmac',
    baseUrl: 'https://accept.paymob.com/api',
    intentionBaseUrl: 'https://flashapi.paymob.com',
    checkoutBaseUrl: 'https://flashapi.paymob.com',
    checkoutFlow: 'legacy' as const,
    integrationIdCard: '12345',
    integrationIdWallet: '67890',
    iframeId: '7777',
    defaultCheckoutMethod: 'CARD' as const,
  };

  const buildAdapter = (overrides?: Partial<typeof baseConfig>) => {
    const paymobConfig = { ...baseConfig, ...(overrides ?? {}) };
    const supportedMethods = [
      paymobConfig.integrationIdCard
        ? { method: 'CARD' as const, integrationId: paymobConfig.integrationIdCard }
        : null,
      paymobConfig.integrationIdWallet
        ? {
            method: 'WALLET' as const,
            integrationId: paymobConfig.integrationIdWallet,
          }
        : null,
    ].filter(Boolean) as Array<{
      method: 'CARD' | 'WALLET';
      integrationId: string;
    }>;

    return new PaymobPaymentProviderAdapter({
      getPaymobConfig: () => paymobConfig,
      getPaymobCheckoutFlow: () => paymobConfig.checkoutFlow,
      getPaymobEnabledMethods: () => supportedMethods,
      getPaymobIntentionPaymentMethodIds: () =>
        supportedMethods.map((item) => Number(item.integrationId)),
      getPaymobCheckoutLaunchUrl: (clientSecret: string) =>
        `${paymobConfig.checkoutBaseUrl}/v1/intention/element/${paymobConfig.publicKey}/${clientSecret}/`,
      getPaymobIntentionCreateUrl: () =>
        `${paymobConfig.intentionBaseUrl}/v1/intention/`,
      getPaymobDefaultCheckoutMethod: () => supportedMethods[0]?.method ?? null,
      resolvePaymobCheckoutMethod: (preferredMethod?: string | null) => {
        const normalized = preferredMethod?.trim().toUpperCase();
        if (normalized === 'CARD' || normalized === 'WALLET') {
          return supportedMethods.some((item) => item.method === normalized)
            ? normalized
            : null;
        }

        return supportedMethods[0]?.method ?? null;
      },
      resolvePaymobIntegrationId: (checkoutMethod?: string | null) => {
        const normalized = checkoutMethod?.trim().toUpperCase();
        const selected = normalized
          ? supportedMethods.find((item) => item.method === normalized)
          : supportedMethods[0];

        return selected?.integrationId ?? null;
      },
      assertCheckoutConfigured: (provider: PaymentProvider) => {
        if (
          provider === PaymentProvider.PAYMOB &&
          (!paymobConfig.apiKey ||
            !paymobConfig.iframeId ||
            (!paymobConfig.integrationIdCard && !paymobConfig.integrationIdWallet))
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
    expect(result.providerMethod).toBe('CARD');
      expect(result.metadata).toMatchObject({
        paymobCheckoutMethod: 'CARD',
        paymobIntegrationId: '12345',
        paymobCheckoutFlow: 'legacy',
      });
  });

  it('initiates a paymob wallet checkout when requested', async () => {
    const adapter = buildAdapter();
    jest
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
      paymobMethod: 'WALLET',
    });

    expect(result.providerMethod).toBe('WALLET');
    expect(result.metadata).toMatchObject({
      paymobCheckoutMethod: 'WALLET',
      paymobIntegrationId: '67890',
      paymobCheckoutFlow: 'legacy',
    });
  });

  it('initiates a paymob intention checkout when configured', async () => {
    const adapter = buildAdapter({
      checkoutFlow: 'intention',
      defaultCheckoutMethod: 'CARD',
    });
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
        new Response(
          JSON.stringify({
            id: 222,
            client_secret: 'client_secret_value',
            special_reference: 'payment_123',
            payment_methods: [
              { name: 'Card', live: true },
              { name: 'Wallets', live: true },
            ],
          }),
          { status: 200 },
        ),
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
    expect(result.providerMethod).toBeNull();
    expect(result.checkoutUrl).toContain('/v1/intention/element/');
    expect(result.checkoutUrl).toContain('client_secret_value');
    expect(result.metadata).toMatchObject({
      paymobCheckoutFlow: 'intention',
      paymobIntentionId: '222',
      paymobClientSecret: 'client_secret_value',
      paymobSpecialReference: 'payment_123',
    });
  });

  it('fails clearly when initiation config is missing', async () => {
    const adapter = buildAdapter({
      apiKey: '',
      integrationIdCard: null,
      integrationIdWallet: null,
    });

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

  it('rejects unsupported requested checkout methods', async () => {
    const adapter = buildAdapter({
      integrationIdWallet: null,
    });

    await expect(
      adapter.initiateSessionPayment({
        paymentId: 'payment_123',
        amountMinor: 50000,
        currency: 'EGP',
        description: 'Session payment',
        sessionId: 'session_1',
        patientEmail: null,
        paymobMethod: 'WALLET',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
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
