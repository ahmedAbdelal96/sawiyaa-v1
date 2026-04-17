import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { HandlePaymobWebhookUseCase } from './handle-paymob-webhook.use-case';

describe('HandlePaymobWebhookUseCase', () => {
  const webhookHandled = {
    handled: true as const,
    providerEventRef: 'paymob:event_1',
    providerPaymentRef: 'order_1',
    outcome: 'SUCCEEDED' as const,
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
    payment?: { id: string; status: PaymentStatus } | null;
  }) {
    const registry = {
      get: jest.fn().mockReturnValue({
        parseAndVerifyWebhook: jest
          .fn()
          .mockReturnValue(input?.parseResult ?? webhookHandled),
      }),
    };

    const paymentRepository = {
      findEventByProviderEventRef: jest.fn().mockResolvedValue(input?.duplicate ?? null),
      findByProviderReference: jest.fn().mockResolvedValue(input?.payment ?? null),
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

    const useCase = new HandlePaymobWebhookUseCase(
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

  it('handles unknown payment reference safely', async () => {
    const setup = buildUseCase({
      payment: null,
    });

    const result = await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });

    expect(result).toEqual({
      received: true,
      handled: false,
      paymentId: null,
    });
    expect(setup.logger.warn).toHaveBeenCalled();
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

  it('uses PAYMOB adapter from registry', async () => {
    const setup = buildUseCase({
      payment: { id: 'payment_1', status: PaymentStatus.PENDING },
    });

    await setup.useCase.execute({
      rawBody: Buffer.from('{}'),
      headers: {},
      query: {},
    });

    expect(setup.registry.get).toHaveBeenCalledWith(PaymentProvider.PAYMOB);
  });
});
