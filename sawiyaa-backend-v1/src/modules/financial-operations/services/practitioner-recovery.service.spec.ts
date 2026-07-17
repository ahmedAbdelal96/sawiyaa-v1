import {
  Prisma,
  PractitionerRecoveryReasonCode,
  PractitionerRecoveryStatus,
} from '@prisma/client';
import { PractitionerRecoveryRepository } from '../repositories/practitioner-recovery.repository';
import { PractitionerRecoveryService } from './practitioner-recovery.service';

describe('PractitionerRecoveryService', () => {
  function buildService(input?: {
    existingRecovery?: Record<string, unknown> | null;
    openRecoveries?: Array<Record<string, unknown>>;
  }) {
    let storedRecovery: Record<string, unknown> | null =
      input?.existingRecovery ?? null;
    const recoveryRepository = {
      findById: jest.fn().mockImplementation(async () => storedRecovery),
      findByIdempotencyKey: jest.fn().mockImplementation(async () => storedRecovery),
      create: jest.fn().mockImplementation(async (data) => {
        storedRecovery = {
          id: 'recovery_1',
          ...data,
        };
        return storedRecovery;
      }),
      summarizeOutstanding: jest
        .fn()
        .mockResolvedValue(input?.openRecoveries ?? []),
      listOpenRecoveries: jest
        .fn()
        .mockResolvedValue(input?.openRecoveries ?? []),
      listActionsByPayoutId: jest.fn().mockResolvedValue([]),
      findActionByIdempotencyKey: jest.fn().mockResolvedValue(null),
      createAction: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockImplementation(async (_id, data) => ({
        id: 'recovery_1',
        practitionerId: 'pract_1',
        currencyCode: 'EGP',
        amount: new Prisma.Decimal('100.00'),
        recoveredAmount: data.recoveredAmount ?? new Prisma.Decimal('0.00'),
        status: data.status ?? PractitionerRecoveryStatus.OPEN,
      })),
    } as unknown as PractitionerRecoveryRepository;

    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PractitionerRecoveryService(
      prisma as never,
      recoveryRepository,
    );

    return { service, recoveryRepository, prisma };
  }

  it('creates recovery records idempotently from the same refund', async () => {
    const setup = buildService();

    const first = await setup.service.createRecoveryForRefund({
      practitionerId: 'pract_1',
      refundId: 'refund_1',
      paymentId: 'payment_1',
      sessionId: 'session_1',
      sessionEarningReviewId: 'review_1',
      amount: '25.00',
      currencyCode: 'egp',
      reasonCode: PractitionerRecoveryReasonCode.REFUND_AFTER_PAYOUT,
      internalReason: 'refund-recovery',
    });

    const second = await setup.service.createRecoveryForRefund({
      practitionerId: 'pract_1',
      refundId: 'refund_1',
      paymentId: 'payment_1',
      sessionId: 'session_1',
      sessionEarningReviewId: 'review_1',
      amount: '25.00',
      currencyCode: 'egp',
      reasonCode: PractitionerRecoveryReasonCode.REFUND_AFTER_PAYOUT,
      internalReason: 'refund-recovery',
    });

    expect(first.wasAlreadyRecorded).toBe(false);
    expect(second.wasAlreadyRecorded).toBe(true);
    expect(setup.recoveryRepository.create).toHaveBeenCalledTimes(1);
  });

  it('applies open recoveries to a payout in order and partially consumes the last one when needed', async () => {
    const setup = buildService({
      openRecoveries: [
        {
          id: 'recovery_1',
          amount: new Prisma.Decimal('60.00'),
          recoveredAmount: new Prisma.Decimal('0.00'),
          status: PractitionerRecoveryStatus.OPEN,
        },
        {
          id: 'recovery_2',
          amount: new Prisma.Decimal('40.00'),
          recoveredAmount: new Prisma.Decimal('0.00'),
          status: PractitionerRecoveryStatus.OPEN,
        },
      ],
    });

    const result = await setup.service.applyOpenRecoveriesToPayout({
      practitionerId: 'pract_1',
      currencyCode: 'EGP',
      payoutId: 'payout_1',
      payoutAmount: '70.00',
      operatorUserId: 'admin_1',
    });

    expect(result.appliedAmount.toFixed(2)).toBe('70.00');
    expect(result.appliedCount).toBe(2);
    expect(setup.recoveryRepository.createAction).toHaveBeenCalledTimes(2);
    expect(setup.recoveryRepository.update).toHaveBeenNthCalledWith(
      1,
      'recovery_1',
      expect.objectContaining({
        recoveredAmount: new Prisma.Decimal('60.00'),
        status: PractitionerRecoveryStatus.RECOVERED,
      }),
      undefined,
    );
    expect(setup.recoveryRepository.update).toHaveBeenNthCalledWith(
      2,
      'recovery_2',
      expect.objectContaining({
        recoveredAmount: new Prisma.Decimal('10.00'),
        status: PractitionerRecoveryStatus.PARTIALLY_RECOVERED,
      }),
      undefined,
    );
  });

  it('collects a recovery partially and keeps it open', async () => {
    const setup = buildService({
      existingRecovery: {
        id: 'recovery_1',
        practitionerId: 'pract_1',
        amount: new Prisma.Decimal('100.00'),
        recoveredAmount: new Prisma.Decimal('25.00'),
        currencyCode: 'EGP',
        status: PractitionerRecoveryStatus.OPEN,
      },
    });

    const result = await setup.service.collectRecovery({
      recoveryId: 'recovery_1',
      amountCollected: '25.00',
      operatorUserId: 'admin_1',
      idempotencyKey: 'collect-1',
      note: 'partial collection',
    });

    expect(result.wasAlreadyRecorded).toBe(false);
    expect(setup.recoveryRepository.createAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'MANUALLY_COLLECTED',
        amount: new Prisma.Decimal('25.00'),
        payoutId: null,
        reason: 'partial collection',
        performedByUserId: 'admin_1',
        idempotencyKey: 'collect-1',
      }),
      undefined,
    );
    expect(setup.recoveryRepository.update).toHaveBeenCalledWith(
      'recovery_1',
      expect.objectContaining({
        recoveredAmount: new Prisma.Decimal('50.00'),
        status: PractitionerRecoveryStatus.PARTIALLY_RECOVERED,
      }),
      undefined,
    );
  });

  it('collects a recovery fully and marks it recovered', async () => {
    const setup = buildService({
      existingRecovery: {
        id: 'recovery_1',
        practitionerId: 'pract_1',
        amount: new Prisma.Decimal('100.00'),
        recoveredAmount: new Prisma.Decimal('60.00'),
        currencyCode: 'EGP',
        status: PractitionerRecoveryStatus.OPEN,
      },
    });

    await setup.service.collectRecovery({
      recoveryId: 'recovery_1',
      amountCollected: '40.00',
      operatorUserId: 'admin_1',
      idempotencyKey: 'collect-2',
    });

    expect(setup.recoveryRepository.update).toHaveBeenCalledWith(
      'recovery_1',
      expect.objectContaining({
        recoveredAmount: new Prisma.Decimal('100.00'),
        status: PractitionerRecoveryStatus.RECOVERED,
        resolvedByUserId: 'admin_1',
      }),
      undefined,
    );
  });

  it('rejects collecting more than the remaining amount', async () => {
    const setup = buildService({
      existingRecovery: {
        id: 'recovery_1',
        practitionerId: 'pract_1',
        amount: new Prisma.Decimal('100.00'),
        recoveredAmount: new Prisma.Decimal('25.00'),
        currencyCode: 'EGP',
        status: PractitionerRecoveryStatus.OPEN,
      },
    });

    await expect(
      setup.service.collectRecovery({
        recoveryId: 'recovery_1',
        amountCollected: '100.00',
        operatorUserId: 'admin_1',
        idempotencyKey: 'collect-3',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'FINANCIAL_OPERATIONS_RECOVERY_AMOUNT_EXCEEDS_REMAINING',
      }),
    });
  });

  it('rejects collecting zero or negative amounts', async () => {
    const setup = buildService({
      existingRecovery: {
        id: 'recovery_1',
        practitionerId: 'pract_1',
        amount: new Prisma.Decimal('100.00'),
        recoveredAmount: new Prisma.Decimal('25.00'),
        currencyCode: 'EGP',
        status: PractitionerRecoveryStatus.OPEN,
      },
    });

    await expect(
      setup.service.collectRecovery({
        recoveryId: 'recovery_1',
        amountCollected: '0.00',
        operatorUserId: 'admin_1',
        idempotencyKey: 'collect-zero',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'FINANCIAL_OPERATIONS_RECOVERY_AMOUNT_INVALID',
      }),
    });
  });

  it('rejects collecting a waived recovery', async () => {
    const setup = buildService({
      existingRecovery: {
        id: 'recovery_1',
        practitionerId: 'pract_1',
        amount: new Prisma.Decimal('100.00'),
        recoveredAmount: new Prisma.Decimal('0.00'),
        currencyCode: 'EGP',
        status: PractitionerRecoveryStatus.WAIVED,
      },
    });

    await expect(
      setup.service.collectRecovery({
        recoveryId: 'recovery_1',
        amountCollected: '10.00',
        operatorUserId: 'admin_1',
        idempotencyKey: 'collect-waived',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'FINANCIAL_OPERATIONS_RECOVERY_ALREADY_RESOLVED',
      }),
    });
  });

  it('rejects collecting an already recovered recovery', async () => {
    const setup = buildService({
      existingRecovery: {
        id: 'recovery_1',
        practitionerId: 'pract_1',
        amount: new Prisma.Decimal('100.00'),
        recoveredAmount: new Prisma.Decimal('100.00'),
        currencyCode: 'EGP',
        status: PractitionerRecoveryStatus.RECOVERED,
      },
    });

    await expect(
      setup.service.collectRecovery({
        recoveryId: 'recovery_1',
        amountCollected: '5.00',
        operatorUserId: 'admin_1',
        idempotencyKey: 'collect-recovered',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'FINANCIAL_OPERATIONS_RECOVERY_ALREADY_RESOLVED',
      }),
    });
  });

  it('waives a recovery with a reason and stores action history', async () => {
    const setup = buildService({
      existingRecovery: {
        id: 'recovery_1',
        practitionerId: 'pract_1',
        amount: new Prisma.Decimal('100.00'),
        recoveredAmount: new Prisma.Decimal('30.00'),
        currencyCode: 'EGP',
        status: PractitionerRecoveryStatus.PARTIALLY_RECOVERED,
      },
    });

    const result = await setup.service.waiveRecovery({
      recoveryId: 'recovery_1',
      operatorUserId: 'admin_1',
      reason: 'manual correction',
      idempotencyKey: 'waive-1',
      note: 'finance override',
    });

    expect(result.wasAlreadyRecorded).toBe(false);
    expect(setup.recoveryRepository.createAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'WAIVED',
        amount: new Prisma.Decimal('70.00'),
        reason: 'manual correction | finance override',
        performedByUserId: 'admin_1',
        idempotencyKey: 'waive-1',
      }),
      undefined,
    );
    expect(setup.recoveryRepository.update).toHaveBeenCalledWith(
      'recovery_1',
      expect.objectContaining({
        status: PractitionerRecoveryStatus.WAIVED,
        resolvedByUserId: 'admin_1',
      }),
      undefined,
    );
  });

  it('rejects waiving without a reason', async () => {
    const setup = buildService({
      existingRecovery: {
        id: 'recovery_1',
        practitionerId: 'pract_1',
        amount: new Prisma.Decimal('100.00'),
        recoveredAmount: new Prisma.Decimal('30.00'),
        currencyCode: 'EGP',
        status: PractitionerRecoveryStatus.OPEN,
      },
    });

    await expect(
      setup.service.waiveRecovery({
        recoveryId: 'recovery_1',
        operatorUserId: 'admin_1',
        reason: '   ',
        idempotencyKey: 'waive-blank',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'FINANCIAL_OPERATIONS_RECOVERY_REASON_REQUIRED',
      }),
    });
  });

  it('rejects waiving an already recovered recovery', async () => {
    const setup = buildService({
      existingRecovery: {
        id: 'recovery_1',
        practitionerId: 'pract_1',
        amount: new Prisma.Decimal('100.00'),
        recoveredAmount: new Prisma.Decimal('100.00'),
        currencyCode: 'EGP',
        status: PractitionerRecoveryStatus.RECOVERED,
      },
    });

    await expect(
      setup.service.waiveRecovery({
        recoveryId: 'recovery_1',
        operatorUserId: 'admin_1',
        reason: 'manual correction',
        idempotencyKey: 'waive-2',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'FINANCIAL_OPERATIONS_RECOVERY_ALREADY_RESOLVED',
      }),
    });
  });

  it('does not duplicate the same idempotency key action', async () => {
    const setup = buildService({
      existingRecovery: {
        id: 'recovery_1',
        practitionerId: 'pract_1',
        amount: new Prisma.Decimal('100.00'),
        recoveredAmount: new Prisma.Decimal('0.00'),
        currencyCode: 'EGP',
        status: PractitionerRecoveryStatus.OPEN,
      },
    });

    const findActionByIdempotencyKey = setup.recoveryRepository.findActionByIdempotencyKey as jest.Mock;
    findActionByIdempotencyKey.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'action_1',
    });

    const first = await setup.service.collectRecovery({
      recoveryId: 'recovery_1',
      amountCollected: '20.00',
      operatorUserId: 'admin_1',
      idempotencyKey: 'same-key',
    });

    const second = await setup.service.collectRecovery({
      recoveryId: 'recovery_1',
      amountCollected: '20.00',
      operatorUserId: 'admin_1',
      idempotencyKey: 'same-key',
    });

    expect(first.wasAlreadyRecorded).toBe(false);
    expect(second.wasAlreadyRecorded).toBe(true);
    expect(setup.recoveryRepository.createAction).toHaveBeenCalledTimes(1);
  });
});
