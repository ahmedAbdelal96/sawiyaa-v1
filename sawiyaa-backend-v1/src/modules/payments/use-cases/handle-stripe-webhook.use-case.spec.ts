import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { HandleStripeWebhookUseCase } from './handle-stripe-webhook.use-case';

describe('HandleStripeWebhookUseCase', () => {
  const webhookHandled = {
    handled: true as const,
    providerEventRef: 'stripe:event_1',
    providerPaymentRef: 'pi_1',
    outcome: 'SUCCEEDED' as const,
    amountMinor: 1000,
    currencyCode: 'USD',
    payload: { ok: true },
  };

  function buildUseCase(input?: {
    parseResult?: {
      handled: true;
      providerEventRef: string;
      providerPaymentRef: string;
      outcome: 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
      payload: Record<string, unknown>;
    };
    duplicate?: { paymentId: string } | null;
    webhookReceipt?: { paymentId: string } | null;
    payment?: {
      id: string;
      status: PaymentStatus;
      amountTotal?: string;
      amountFromGateway?: string;
      currencyCode?: string;
    } | null;
  }) {
    const registry = {
      get: jest.fn().mockReturnValue({
        parseAndVerifyWebhook: jest
          .fn()
          .mockReturnValue(input?.parseResult ?? webhookHandled),
      }),
    };

    const paymentRepository = {
      findEventByProviderEventRef: jest
        .fn()
        .mockResolvedValue(input?.duplicate ?? null),
      findWebhookReceipt: jest
        .fn()
        .mockResolvedValue(input?.webhookReceipt ?? input?.duplicate ?? null),
      createWebhookReceipt: jest.fn().mockResolvedValue({}),
      findByProviderReference: jest
        .fn()
        .mockResolvedValue(
          input?.payment
            ? {
                amountTotal: '10.00',
                amountFromGateway: input.payment.amountTotal ?? '10.00',
                currencyCode: 'USD',
                ...input.payment,
              }
            : null,
        ),
      findById: jest.fn().mockResolvedValue(input?.payment ?? null),
      createEvent: jest.fn().mockResolvedValue({}),
    };

    const markSucceeded = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const markFailed = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const expirePayment = {
      execute: jest.fn().mockResolvedValue({}),
    };
    const logger = {
      warn: jest.fn(),
    };

    const useCase = new HandleStripeWebhookUseCase(
      registry as never,
      paymentRepository as never,
      markSucceeded as never,
      markFailed as never,
      expirePayment as never,
      logger as never,
    );

    return {
      useCase,
      registry,
      paymentRepository,
      markSucceeded,
      markFailed,
      expirePayment,
      logger,
    };
  }

  it('accepts only the gateway share of a mixed-funded discounted payment', async () => {
    const setup = buildUseCase({
      payment: {
        id: 'mixed_payment',
        status: PaymentStatus.PENDING,
        amountTotal: '500.00',
        amountFromGateway: '300.00',
        currencyCode: 'EGP',
      },
    });
    setup.registry
      .get()
      .parseAndVerifyWebhook.mockReturnValue({
        ...webhookHandled,
        amountMinor: 30000,
        currencyCode: 'EGP',
      });
    await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });
    expect(setup.markSucceeded.execute).toHaveBeenCalledTimes(1);
    expect(setup.markSucceeded.execute).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: 'mixed_payment' }),
    );
  });

  it('handles duplicate webhook delivery idempotently', async () => {
    const setup = buildUseCase({
      duplicate: { paymentId: 'payment_1' },
      payment: { id: 'payment_1', status: PaymentStatus.PENDING },
    });

    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });

    expect(result).toEqual({
      received: true,
      handled: true,
      paymentId: 'payment_1',
    });
    expect(setup.markSucceeded.execute).not.toHaveBeenCalled();
  });

  it('uses the unique webhook receipt as the Stripe replay gate', async () => {
    const setup = buildUseCase({
      webhookReceipt: { paymentId: 'payment_receipt' },
      payment: { id: 'payment_receipt', status: PaymentStatus.PENDING },
    });

    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });

    expect(result).toEqual({
      received: true,
      handled: true,
      paymentId: 'payment_receipt',
    });
    expect(setup.paymentRepository.findWebhookReceipt).toHaveBeenCalledWith(
      PaymentProvider.STRIPE,
      webhookHandled.providerEventRef,
    );
    expect(setup.paymentRepository.findEventByProviderEventRef).not.toHaveBeenCalled();
    expect(setup.markSucceeded.execute).not.toHaveBeenCalled();
  });

  it('delegates first Stripe webhook processing to the transactional capture path', async () => {
    const setup = buildUseCase({
      payment: { id: 'payment_first', status: PaymentStatus.PENDING },
    });

    await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });

    expect(setup.markSucceeded.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment_first',
        providerEventRef: webhookHandled.providerEventRef,
      }),
    );
  });

  it('treats a concurrent Stripe receipt unique conflict as a safe replay', async () => {
    const setup = buildUseCase({
      payment: { id: 'payment_race', status: PaymentStatus.CAPTURED },
    });
    setup.paymentRepository.findWebhookReceipt
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ paymentId: 'payment_race' });
    setup.paymentRepository.createWebhookReceipt.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['providerEventRef'] },
    });

    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });

    expect(result).toEqual({
      received: true,
      handled: true,
      paymentId: 'payment_race',
    });
    expect(setup.paymentRepository.createEvent).not.toHaveBeenCalled();
    expect(setup.markSucceeded.execute).not.toHaveBeenCalled();
  });

  it('re-enters idempotent capture for a duplicate success after capture', async () => {
    const setup = buildUseCase({
      duplicate: { paymentId: 'payment_1' },
      payment: { id: 'payment_1', status: PaymentStatus.CAPTURED },
    });

    await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });

    expect(setup.markSucceeded.execute).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: 'payment_1' }),
    );
  });

  it('does not re-run side effects on repeated terminal outcome', async () => {
    const setup = buildUseCase({
      payment: { id: 'payment_1', status: PaymentStatus.CAPTURED },
    });

    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });

    expect(result).toEqual({
      received: true,
      handled: true,
      paymentId: 'payment_1',
    });
    expect(setup.paymentRepository.createEvent).toHaveBeenCalledTimes(1);
    expect(setup.markSucceeded.execute).not.toHaveBeenCalled();
  });

  it('maps failed webhook to mark-payment-failed use case', async () => {
    const setup = buildUseCase({
      parseResult: {
        ...webhookHandled,
        outcome: 'FAILED',
      },
      payment: { id: 'payment_1', status: PaymentStatus.PENDING },
    });

    await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });

    expect(setup.markFailed.execute).toHaveBeenCalledTimes(1);
    expect(setup.markSucceeded.execute).not.toHaveBeenCalled();
    expect(setup.expirePayment.execute).not.toHaveBeenCalled();
  });

  it('maps expired webhook to expire-payment use case', async () => {
    const setup = buildUseCase({
      parseResult: {
        ...webhookHandled,
        outcome: 'EXPIRED',
      },
      payment: { id: 'payment_1', status: PaymentStatus.PENDING },
    });

    await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });

    expect(setup.expirePayment.execute).toHaveBeenCalledTimes(1);
    expect(setup.markSucceeded.execute).not.toHaveBeenCalled();
    expect(setup.markFailed.execute).not.toHaveBeenCalled();
  });

  it('uses STRIPE adapter from registry', async () => {
    const setup = buildUseCase({
      payment: { id: 'payment_1', status: PaymentStatus.PENDING },
    });

    await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });

    expect(setup.registry.get).toHaveBeenCalledWith(PaymentProvider.STRIPE);
  });

  it('rejects a success webhook with a mismatched amount or currency', async () => {
    const setup = buildUseCase({
      payment: {
        id: 'payment_1',
        status: PaymentStatus.PENDING,
        amountTotal: '20.00',
        currencyCode: 'USD',
      },
    });
    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });
    expect(result).toEqual({
      received: true,
      handled: false,
      paymentId: 'payment_1',
    });
    expect(setup.markSucceeded.execute).not.toHaveBeenCalled();
    expect(setup.paymentRepository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'FINANCIAL_MISMATCH_AMOUNT_OR_CURRENCY',
      }),
    );
  });

  it('does not fulfill a success webhook with an unknown provider reference', async () => {
    const setup = buildUseCase({ payment: null });
    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });
    expect(result).toEqual({ received: true, handled: false, paymentId: null });
    expect(setup.markSucceeded.execute).not.toHaveBeenCalled();
  });

  it('does not capture a late success webhook for an expired payment', async () => {
    const setup = buildUseCase({
      payment: { id: 'payment_1', status: PaymentStatus.EXPIRED },
    });

    await expect(
      setup.useCase.execute({
        rawBody: Buffer.from('{}'),
        headers: {},
        query: {},
      }),
    ).resolves.toEqual({
      received: true,
      handled: false,
      paymentId: 'payment_1',
    });
    expect(setup.markSucceeded.execute).not.toHaveBeenCalled();
    expect(setup.paymentRepository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PAYMENT_LATE_SUCCESS_REVIEW_REQUIRED',
        reason: 'PAYMENT_SUCCESS_RECEIVED_AFTER_EXPIRY',
      }),
    );
  });
});
