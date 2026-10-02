import { StripePaymentProviderAdapter } from './stripe-payment-provider.adapter';

describe('StripePaymentProviderAdapter idempotency', () => {
  const adapter = new StripePaymentProviderAdapter({
    assertCheckoutConfigured: jest.fn(),
    getStripeConfig: () => ({
      apiBaseUrl: 'https://api.stripe.test',
      secretKey: 'sk_test',
    }),
  } as never);

  beforeEach(() => jest.restoreAllMocks());

  it('keys PaymentIntent creation by the persisted payment id', async () => {
    const fetchMock = jest.spyOn(global, 'fetch' as never).mockResolvedValue(
      new Response(JSON.stringify({ id: 'pi_1', status: 'requires_action' }), {
        status: 200,
      }),
    );
    await adapter.initiateSessionPayment({
      paymentId: 'payment-1',
      amountMinor: 30000,
      currency: 'EGP',
      description: 'Session',
      sessionId: 'session-1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.stripe.test/v1/payment_intents',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key': 'payment:payment-1',
        }),
      }),
    );
  });

  it('keys refund creation by the persisted refund id', async () => {
    const fetchMock = jest.spyOn(global, 'fetch' as never).mockResolvedValue(
      new Response(JSON.stringify({ id: 're_1', status: 'succeeded' }), {
        status: 200,
      }),
    );
    await adapter.refundPayment({
      refundId: 'refund-1',
      paymentId: 'payment-1',
      providerPaymentRef: 'pi_1',
      providerOrderRef: null,
      amountMinor: 10000,
      currency: 'EGP',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.stripe.test/v1/refunds',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key': 'refund:refund-1',
        }),
      }),
    );
  });

  it('recovers a lost PaymentIntent response by the persisted payment id', async () => {
    jest.spyOn(global, 'fetch' as never).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'pi_recovered',
              status: 'requires_action',
              amount: 30000,
              currency: 'egp',
              client_secret: 'secret',
              metadata: { paymentId: 'payment-1' },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    await expect(
      adapter.reconcilePayment({
        paymentId: 'payment-1',
        providerPaymentRef: null,
        providerOrderRef: null,
        amountMinor: 30000,
        currency: 'EGP',
      }),
    ).resolves.toMatchObject({
      outcome: 'PROCESSING',
      providerPaymentRef: 'pi_recovered',
      amountMinor: 30000,
      currencyCode: 'EGP',
      clientSecret: 'secret',
    });
  });

  it('finds the same Stripe refund by refund metadata after a lost response', async () => {
    jest.spyOn(global, 'fetch' as never).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 're_recovered',
              status: 'succeeded',
              amount: 10000,
              currency: 'egp',
              payment_intent: 'pi_1',
              metadata: { refundId: 'refund-1' },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    await expect(
      adapter.reconcileRefund({
        refundId: 'refund-1',
        paymentId: 'payment-1',
        providerPaymentRef: 'pi_1',
        providerOrderRef: null,
        providerRefundRef: null,
        amountMinor: 10000,
        priorSucceededRefundMinor: 0,
        currency: 'EGP',
      }),
    ).resolves.toMatchObject({
      outcome: 'SUCCEEDED',
      providerRefundRef: 're_recovered',
    });
  });
});
