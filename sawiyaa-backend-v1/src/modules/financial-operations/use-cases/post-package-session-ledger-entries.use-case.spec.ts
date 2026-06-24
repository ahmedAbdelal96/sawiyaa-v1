import { PaymentStatus, SessionStatus } from '@prisma/client';
import { PackageSettlementService } from '../services/package-settlement.service';
import { PostPackageSessionLedgerEntriesUseCase } from './post-package-session-ledger-entries.use-case';

describe('PostPackageSessionLedgerEntriesUseCase', () => {
  function buildUseCase(input?: {
    sessionStatus?: SessionStatus;
    purchaseStatus?: 'ACTIVE' | 'COMPLETED';
    paymentCoverageType?: 'PACKAGE' | 'DIRECT_PAYMENT';
    linkedSessionStatuses?: SessionStatus[];
    paymentStatus?: PaymentStatus;
  }) {
    const packagePurchase = {
      id: 'purchase-1',
      status: input?.purchaseStatus ?? 'ACTIVE',
      paymentId: 'payment-1',
      practitionerId: 'practitioner-1',
      patientId: 'patient-1',
      payment: {
        id: 'payment-1',
        status: input?.paymentStatus ?? PaymentStatus.CAPTURED,
        currencyCode: 'EGP',
      },
      packagePlan: {
        code: 'SESSIONS_4',
      },
      planCodeSnapshot: 'SESSIONS_4',
      sessionCountSnapshot: 4,
      discountPercentSnapshot: 10,
      baseSessionPriceEgpSnapshot: 100,
      baseSessionPriceUsdSnapshot: 5,
      currencyCodeSnapshot: 'EGP',
      selectedBaseSessionPriceSnapshot: 100,
      undiscountedTotalSnapshot: 400,
      discountAmountSnapshot: 40,
      patientPayableTotalSnapshot: 360,
      platformDiscountShareSnapshot: 20,
      practitionerDiscountShareSnapshot: 20,
      commissionModeSnapshot: 'LOCAL_70_30',
      platformOriginalShareSnapshot: 120,
      practitionerOriginalShareSnapshot: 280,
      platformFinalShareSnapshot: 100,
      practitionerFinalShareSnapshot: 260,
      sessionDurationMinutesSnapshot: 30,
      sessionModeSnapshot: 'VIDEO',
      sessions: (
        input?.linkedSessionStatuses ?? [
          SessionStatus.COMPLETED,
          SessionStatus.PENDING_PAYMENT,
        ]
      ).map((status, index) => ({
        id: `session-${index + 1}`,
        status,
        packageSessionIndex: index + 1,
        packageSessionCount: 4,
      })),
    };

    const prisma = {
      session: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'session-1',
          status: input?.sessionStatus ?? SessionStatus.COMPLETED,
          paymentCoverageType: input?.paymentCoverageType ?? 'PACKAGE',
          packagePurchaseId: 'purchase-1',
          packageSessionIndex: 1,
          packageSessionCount: 4,
          packagePurchase,
        }),
      },
      patientPackagePurchase: {
        update: jest.fn().mockResolvedValue(packagePurchase),
      },
    };

    const packageSettlementService = {
      syncFromPurchase: jest.fn().mockResolvedValue({ id: 'settlement-1' }),
    } as unknown as PackageSettlementService;

    const useCase = new PostPackageSessionLedgerEntriesUseCase(
      prisma as never,
      packageSettlementService,
    );

    return {
      useCase,
      prisma,
      packageSettlementService,
    };
  }

  it('syncs package settlement progress without posting package ledger entries', async () => {
    const setup = buildUseCase({
      linkedSessionStatuses: [SessionStatus.COMPLETED, SessionStatus.COMPLETED],
    });

    const result = await setup.useCase.execute({
      sessionId: 'session-1',
      tx: setup.prisma as never,
    });

    expect(
      setup.packageSettlementService.syncFromPurchase,
    ).toHaveBeenCalledTimes(1);
    expect(setup.prisma.patientPackagePurchase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'purchase-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        }),
      }),
    );
    expect(result.ledgerEntries).toEqual([]);
    expect(result.wasAlreadyPosted).toBe(true);
    expect(result.purchase.status).toBe('ACTIVE');
  });

  it('does not post package earnings when the purchase is active but sessions are not completed', async () => {
    const setup = buildUseCase({
      linkedSessionStatuses: [
        SessionStatus.CONFIRMED,
        SessionStatus.PENDING_PAYMENT,
      ],
    });

    await setup.useCase.execute({
      sessionId: 'session-1',
      tx: setup.prisma as never,
    });

    expect(
      setup.packageSettlementService.syncFromPurchase,
    ).toHaveBeenCalledTimes(1);
    expect(setup.prisma.patientPackagePurchase.update).not.toHaveBeenCalled();
  });

  it('is no-op for non-package coverage', async () => {
    const setup = buildUseCase({
      paymentCoverageType: 'DIRECT_PAYMENT',
    });

    const result = await setup.useCase.execute({
      sessionId: 'session-1',
      tx: setup.prisma as never,
    });

    expect(
      setup.packageSettlementService.syncFromPurchase,
    ).not.toHaveBeenCalled();
    expect(result.ledgerEntries).toEqual([]);
    expect(result.wasAlreadyPosted).toBe(true);
  });

  it('rejects package sessions when payment is not captured', async () => {
    const setup = buildUseCase({
      paymentStatus: PaymentStatus.CREATED,
    });

    await expect(
      setup.useCase.execute({
        sessionId: 'session-1',
        tx: setup.prisma as never,
      }),
    ).rejects.toThrow();
  });
});
