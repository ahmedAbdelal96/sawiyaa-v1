import { Prisma, SessionStatus } from '@prisma/client';
import { LedgerRepository } from '../repositories/ledger.repository';
import { PackageSettlementRepository } from '../repositories/package-settlement.repository';
import { RefreshPractitionerWalletService } from './refresh-practitioner-wallet.service';
import { SessionEarningReviewService } from './session-earning-review.service';
import { PackageSettlementService } from './package-settlement.service';

describe('PackageSettlementService', () => {
  function buildService(input?: {
    existingSettlement?: Record<string, unknown> | null;
    releaseSettlement?: Record<string, unknown> | null;
    releaseLedgerEntries?: Array<Record<string, unknown>>;
    legacyLedgerEntries?: Array<Record<string, unknown>>;
  }) {
    const tx = {
      packageSettlement: {
        findUnique: jest
          .fn()
          .mockResolvedValue(input?.existingSettlement ?? null),
        upsert: jest.fn().mockImplementation(async (args) => ({
          id: 'settlement-1',
          ...args.create,
        })),
        create: jest.fn().mockResolvedValue({
          id: 'settlement-1',
        }),
        update: jest.fn().mockImplementation(async (_, data) => ({
          id: 'settlement-1',
          ...data.data,
        })),
      },
      ledgerEntry: {
        findMany: jest
          .fn()
          .mockResolvedValue(input?.releaseLedgerEntries ?? []),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      sessionEarningReview: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn(tx)),
    };

    const packageSettlementRepository = new PackageSettlementRepository(
      prisma as never,
    );
    packageSettlementRepository.findByPurchaseId = jest
      .fn()
      .mockResolvedValue(input?.existingSettlement ?? null);
    packageSettlementRepository.upsertByPurchaseId = jest
      .fn()
      .mockImplementation(async (_, create) => ({
        id: 'settlement-1',
        ...create,
      }));
    packageSettlementRepository.findById = jest
      .fn()
      .mockResolvedValue(input?.releaseSettlement ?? null);
    packageSettlementRepository.updateById = jest
      .fn()
      .mockImplementation(async (_, data) => ({
        id: 'settlement-1',
        ...data,
      }));

    const ledgerRepository = new LedgerRepository(prisma as never);
    ledgerRepository.findByReference = jest
      .fn()
      .mockResolvedValue(input?.releaseLedgerEntries ?? []);
    ledgerRepository.createManyLedgerEntries = jest
      .fn()
      .mockResolvedValue({ count: 2 });
    ledgerRepository.findLegacyPackageEarningEntriesBySessionIds = jest
      .fn()
      .mockResolvedValue(input?.legacyLedgerEntries ?? []);
    ledgerRepository.findSessionReviewPractitionerEarningEntriesBySessionIds =
      jest.fn().mockResolvedValue([]);

    const refreshPractitionerWalletService = {
      refresh: jest.fn().mockResolvedValue(undefined),
    } as unknown as RefreshPractitionerWalletService;
    const sessionEarningReviewService = {
      approveReview: jest.fn().mockResolvedValue({}),
    } as unknown as SessionEarningReviewService;

    const service = new PackageSettlementService(
      prisma as never,
      ledgerRepository,
      packageSettlementRepository,
      refreshPractitionerWalletService,
      sessionEarningReviewService,
    );

    return {
      service,
      prisma,
      tx,
      packageSettlementRepository,
      ledgerRepository,
      refreshPractitionerWalletService,
      sessionEarningReviewService,
    };
  }

  const purchase = {
    id: 'purchase-1',
    practitionerId: 'practitioner-1',
    patientId: 'patient-1',
    paymentId: 'payment-1',
    status: 'ACTIVE',
    sessionCountSnapshot: 4,
    currencyCodeSnapshot: 'EGP',
    selectedCurrencyCode: 'EGP',
    selectedBaseSessionPriceSnapshot: new Prisma.Decimal('100.00'),
    discountAmountSnapshot: new Prisma.Decimal('40.00'),
    practitionerFinalShareSnapshot: new Prisma.Decimal('260.00'),
    platformFinalShareSnapshot: new Prisma.Decimal('100.00'),
    planCodeSnapshot: 'SESSIONS_4',
    titleSnapshot: '4 Sessions',
    payment: {
      id: 'payment-1',
      status: 'CAPTURED',
      currencyCode: 'EGP',
    },
    packagePlan: {
      code: 'SESSIONS_4',
      title: '4 Sessions',
    },
    sessions: [
      {
        id: 'session-1',
        status: SessionStatus.COMPLETED,
        packageSessionIndex: 1,
        packageSessionCount: 4,
      },
      {
        id: 'session-2',
        status: SessionStatus.PENDING_PAYMENT,
        packageSessionIndex: 2,
        packageSessionCount: 4,
      },
      {
        id: 'session-3',
        status: SessionStatus.PENDING_PAYMENT,
        packageSessionIndex: 3,
        packageSessionCount: 4,
      },
      {
        id: 'session-4',
        status: SessionStatus.PENDING_PAYMENT,
        packageSessionIndex: 4,
        packageSessionCount: 4,
      },
    ],
  };

  it('creates a HELD settlement for a paid package purchase', async () => {
    const setup = buildService();

    const settlement = await setup.service.ensureForPurchase(purchase as never);

    expect(
      setup.packageSettlementRepository.upsertByPurchaseId,
    ).toHaveBeenCalledWith(
      'purchase-1',
      expect.objectContaining({
        purchaseId: 'purchase-1',
        practitionerId: 'practitioner-1',
        patientId: 'patient-1',
        currencyCode: 'EGP',
        status: 'HELD',
        sessionCount: 4,
        heldPractitionerAmount: new Prisma.Decimal('260.00'),
        heldPlatformAmount: new Prisma.Decimal('100.00'),
        releasablePractitionerAmount: new Prisma.Decimal(0),
        releasedPractitionerAmount: new Prisma.Decimal(0),
        discountAppliedAmount: new Prisma.Decimal('40.00'),
      }),
      expect.anything(),
    );
    expect(settlement.id).toBe('settlement-1');
  });

  it('does not duplicate the package settlement when one already exists', async () => {
    const existing = {
      id: 'settlement-1',
    };
    const setup = buildService({
      existingSettlement: existing,
    });

    const settlement = await setup.service.ensureForPurchase(purchase as never);

    expect(
      setup.packageSettlementRepository.upsertByPurchaseId,
    ).not.toHaveBeenCalled();
    expect(settlement).toBe(existing);
  });

  it('reconciles an active paid purchase into a held settlement without duplication', async () => {
    const setup = buildService();

    const settlement = await setup.service.reconcilePurchase(purchase as never);

    expect(
      setup.packageSettlementRepository.upsertByPurchaseId,
    ).toHaveBeenCalledTimes(1);
    expect(setup.packageSettlementRepository.updateById).toHaveBeenCalledTimes(
      1,
    );
    expect(settlement?.status).toBe('HELD');
  });

  it('skips reconciliation for pending unpaid purchases', async () => {
    const setup = buildService();

    const settlement = await setup.service.reconcilePurchase({
      ...purchase,
      status: 'PENDING_PAYMENT',
      payment: {
        id: 'payment-1',
        status: 'PENDING',
        currencyCode: 'EGP',
      },
    } as never);

    expect(settlement).toBeNull();
    expect(
      setup.packageSettlementRepository.upsertByPurchaseId,
    ).not.toHaveBeenCalled();
    expect(setup.packageSettlementRepository.updateById).not.toHaveBeenCalled();
  });

  it('does not auto-release incomplete package settlements', async () => {
    const heldSettlement = {
      id: 'settlement-1',
      purchaseId: 'purchase-1',
      practitionerId: 'practitioner-1',
      patientId: 'patient-1',
      currencyCode: 'EGP',
      status: 'HELD',
      sessionCount: 4,
      completedSessionsCount: 2,
      heldPractitionerAmount: new Prisma.Decimal('260.00'),
      heldPlatformAmount: new Prisma.Decimal('100.00'),
      releasablePractitionerAmount: new Prisma.Decimal(0),
      releasedPractitionerAmount: new Prisma.Decimal(0),
      normalEquivalentUsedAmount: new Prisma.Decimal('200.00'),
      discountAppliedAmount: new Prisma.Decimal('40.00'),
      reviewedAt: null,
      reviewedByAdminId: null,
      releasedAt: null,
      releasedByAdminId: null,
      decision: null,
      notes: null,
      metadataJson: null,
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
      updatedAt: new Date('2026-05-05T00:00:00.000Z'),
      purchase: {
        paymentId: 'payment-1',
      },
    };
    const setup = buildService({
      releaseSettlement: heldSettlement,
    });

    await expect(
      setup.service.releaseReadySettlement({
        settlementId: 'settlement-1',
        releasedByAdminId: 'admin-1',
      }),
    ).rejects.toThrow();

    expect(
      setup.ledgerRepository.createManyLedgerEntries,
    ).not.toHaveBeenCalled();
    expect(
      setup.refreshPractitionerWalletService.refresh,
    ).not.toHaveBeenCalled();
  });

  it('syncs completed package sessions without refreshing the practitioner wallet', async () => {
    const setup = buildService();

    await setup.service.syncFromPurchase(
      {
        ...purchase,
        sessions: [
          { status: SessionStatus.COMPLETED },
          { status: SessionStatus.COMPLETED },
          { status: SessionStatus.COMPLETED },
          { status: SessionStatus.PENDING_PAYMENT },
        ],
      } as never,
      setup.tx as never,
    );

    expect(setup.packageSettlementRepository.updateById).toHaveBeenCalledWith(
      'settlement-1',
      expect.objectContaining({
        completedSessionsCount: 3,
        normalEquivalentUsedAmount: new Prisma.Decimal('300.00'),
        status: 'HELD',
      }),
      expect.anything(),
    );
    expect(
      setup.refreshPractitionerWalletService.refresh,
    ).not.toHaveBeenCalled();
  });

  it('marks a package settlement ready to release when all sessions are complete', async () => {
    const setup = buildService({
      existingSettlement: null,
    });

    await setup.service.syncFromPurchase(
      {
        ...purchase,
        sessions: [
          { status: SessionStatus.COMPLETED },
          { status: SessionStatus.COMPLETED },
          { status: SessionStatus.COMPLETED },
          { status: SessionStatus.COMPLETED },
        ],
      } as never,
      setup.tx as never,
    );

    expect(setup.packageSettlementRepository.updateById).toHaveBeenCalledWith(
      'settlement-1',
      expect.objectContaining({
        completedSessionsCount: 4,
        status: 'READY_TO_RELEASE',
        releasablePractitionerAmount: new Prisma.Decimal('260.00'),
      }),
      expect.anything(),
    );
  });

  it('reconciles a completed purchase into READY_TO_RELEASE when all linked sessions are completed', async () => {
    const setup = buildService({
      existingSettlement: null,
    });

    const settlement = await setup.service.reconcilePurchase({
      ...purchase,
      status: 'COMPLETED',
      sessions: [
        {
          id: 'session-1',
          status: SessionStatus.COMPLETED,
          packageSessionIndex: 1,
          packageSessionCount: 4,
        },
        {
          id: 'session-2',
          status: SessionStatus.COMPLETED,
          packageSessionIndex: 2,
          packageSessionCount: 4,
        },
        {
          id: 'session-3',
          status: SessionStatus.COMPLETED,
          packageSessionIndex: 3,
          packageSessionCount: 4,
        },
        {
          id: 'session-4',
          status: SessionStatus.COMPLETED,
          packageSessionIndex: 4,
          packageSessionCount: 4,
        },
      ],
    } as never);

    expect(setup.packageSettlementRepository.updateById).toHaveBeenCalledWith(
      'settlement-1',
      expect.objectContaining({
        completedSessionsCount: 4,
        status: 'READY_TO_RELEASE',
        releasablePractitionerAmount: new Prisma.Decimal('260.00'),
      }),
      expect.anything(),
    );
    expect(settlement?.status).toBe('READY_TO_RELEASE');
  });

  it('releases ready package settlements exactly once and refreshes the wallet', async () => {
    const readySettlement = {
      id: 'settlement-1',
      purchaseId: 'purchase-1',
      practitionerId: 'practitioner-1',
      patientId: 'patient-1',
      currencyCode: 'EGP',
      status: 'READY_TO_RELEASE',
      sessionCount: 4,
      completedSessionsCount: 4,
      heldPractitionerAmount: new Prisma.Decimal('260.00'),
      heldPlatformAmount: new Prisma.Decimal('100.00'),
      releasablePractitionerAmount: new Prisma.Decimal('260.00'),
      releasedPractitionerAmount: new Prisma.Decimal(0),
      normalEquivalentUsedAmount: new Prisma.Decimal('400.00'),
      discountAppliedAmount: new Prisma.Decimal('40.00'),
      reviewedAt: null,
      reviewedByAdminId: null,
      releasedAt: null,
      releasedByAdminId: null,
      decision: null,
      notes: null,
      metadataJson: null,
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
      updatedAt: new Date('2026-05-05T00:00:00.000Z'),
      purchase: {
        paymentId: 'payment-1',
      },
    };
    const setup = buildService({
      releaseSettlement: readySettlement,
      releaseLedgerEntries: [],
    });

    const released = await setup.service.releaseReadySettlement({
      settlementId: 'settlement-1',
      releasedByAdminId: 'admin-1',
    });

    expect(
      setup.ledgerRepository.createManyLedgerEntries,
    ).toHaveBeenCalledTimes(1);
    expect(setup.refreshPractitionerWalletService.refresh).toHaveBeenCalledWith(
      'practitioner-1',
      expect.anything(),
    );
    expect(released.status).toBe('RELEASED');
    expect(released.decision).toBe('FULL_COMPLETION_ADMIN_RELEASE');
  });

  it('approves pending package session reviews during release when review rows exist', async () => {
    const readySettlement = {
      id: 'settlement-1',
      purchaseId: 'purchase-1',
      practitionerId: 'practitioner-1',
      patientId: 'patient-1',
      currencyCode: 'EGP',
      status: 'READY_TO_RELEASE',
      sessionCount: 4,
      completedSessionsCount: 4,
      heldPractitionerAmount: new Prisma.Decimal('260.00'),
      heldPlatformAmount: new Prisma.Decimal('100.00'),
      releasablePractitionerAmount: new Prisma.Decimal('260.00'),
      releasedPractitionerAmount: new Prisma.Decimal(0),
      normalEquivalentUsedAmount: new Prisma.Decimal('400.00'),
      discountAppliedAmount: new Prisma.Decimal('40.00'),
      reviewedAt: null,
      reviewedByAdminId: null,
      releasedAt: null,
      releasedByAdminId: null,
      decision: null,
      notes: null,
      metadataJson: null,
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
      updatedAt: new Date('2026-05-05T00:00:00.000Z'),
      purchase: {
        paymentId: 'payment-1',
      },
    };
    const setup = buildService({
      releaseSettlement: readySettlement,
    });
    (setup.tx.sessionEarningReview.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'review-1' },
      { id: 'review-2' },
    ]);

    await setup.service.releaseReadySettlement({
      settlementId: 'settlement-1',
      releasedByAdminId: 'admin-1',
    });

    expect(
      setup.sessionEarningReviewService.approveReview,
    ).toHaveBeenCalledTimes(2);
    expect(setup.ledgerRepository.createManyLedgerEntries).not.toHaveBeenCalled();
    expect(setup.refreshPractitionerWalletService.refresh).toHaveBeenCalledWith(
      'practitioner-1',
      expect.anything(),
    );
  });

  it('releases package settlements without duplicating ledger entries when session review earnings already exist', async () => {
    const readySettlement = {
      id: 'settlement-1',
      purchaseId: 'purchase-1',
      practitionerId: 'practitioner-1',
      patientId: 'patient-1',
      currencyCode: 'EGP',
      status: 'READY_TO_RELEASE',
      sessionCount: 4,
      completedSessionsCount: 4,
      heldPractitionerAmount: new Prisma.Decimal('260.00'),
      heldPlatformAmount: new Prisma.Decimal('100.00'),
      releasablePractitionerAmount: new Prisma.Decimal('260.00'),
      releasedPractitionerAmount: new Prisma.Decimal(0),
      normalEquivalentUsedAmount: new Prisma.Decimal('400.00'),
      discountAppliedAmount: new Prisma.Decimal('40.00'),
      reviewedAt: null,
      reviewedByAdminId: null,
      releasedAt: null,
      releasedByAdminId: null,
      decision: null,
      notes: null,
      metadataJson: null,
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
      updatedAt: new Date('2026-05-05T00:00:00.000Z'),
      purchase: {
        paymentId: 'payment-1',
        sessions: [
          { id: 'session-1' },
          { id: 'session-2' },
          { id: 'session-3' },
          { id: 'session-4' },
        ],
      },
    };
    const setup = buildService({
      releaseSettlement: readySettlement,
    });
    (setup.tx.sessionEarningReview.count as jest.Mock).mockResolvedValueOnce(2);
    (
      setup.ledgerRepository.findSessionReviewPractitionerEarningEntriesBySessionIds as jest.Mock
    ).mockResolvedValueOnce([
      {
        id: 'entry-1',
        sessionId: 'session-1',
        sessionEarningReviewId: 'review-1',
        amount: new Prisma.Decimal('150.00'),
        currencyCode: 'EGP',
      },
      {
        id: 'entry-2',
        sessionId: 'session-2',
        sessionEarningReviewId: 'review-2',
        amount: new Prisma.Decimal('110.00'),
        currencyCode: 'EGP',
      },
    ]);

    const released = await setup.service.releaseReadySettlement({
      settlementId: 'settlement-1',
      releasedByAdminId: 'admin-1',
    });

    expect(setup.ledgerRepository.createManyLedgerEntries).not.toHaveBeenCalled();
    expect(
      setup.refreshPractitionerWalletService.refresh,
    ).toHaveBeenCalledWith('practitioner-1', expect.anything());
    expect(released.status).toBe('RELEASED');
    expect(released.releasedPractitionerAmount.toString()).toBe('260');
  });

  it('does not fall back to direct release entries when package session reviews exist but no practitioner payout is approved', async () => {
    const readySettlement = {
      id: 'settlement-1',
      purchaseId: 'purchase-1',
      practitionerId: 'practitioner-1',
      patientId: 'patient-1',
      currencyCode: 'EGP',
      status: 'READY_TO_RELEASE',
      sessionCount: 4,
      completedSessionsCount: 4,
      heldPractitionerAmount: new Prisma.Decimal('260.00'),
      heldPlatformAmount: new Prisma.Decimal('100.00'),
      releasablePractitionerAmount: new Prisma.Decimal('260.00'),
      releasedPractitionerAmount: new Prisma.Decimal(0),
      normalEquivalentUsedAmount: new Prisma.Decimal('400.00'),
      discountAppliedAmount: new Prisma.Decimal('40.00'),
      reviewedAt: null,
      reviewedByAdminId: null,
      releasedAt: null,
      releasedByAdminId: null,
      decision: null,
      notes: null,
      metadataJson: null,
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
      updatedAt: new Date('2026-05-05T00:00:00.000Z'),
      purchase: {
        paymentId: 'payment-1',
        sessions: [
          { id: 'session-1' },
          { id: 'session-2' },
          { id: 'session-3' },
          { id: 'session-4' },
        ],
      },
    };
    const setup = buildService({
      releaseSettlement: readySettlement,
    });
    (setup.tx.sessionEarningReview.count as jest.Mock).mockResolvedValueOnce(1);
    (
      setup.ledgerRepository.findSessionReviewPractitionerEarningEntriesBySessionIds as jest.Mock
    ).mockResolvedValueOnce([]);

    const released = await setup.service.releaseReadySettlement({
      settlementId: 'settlement-1',
      releasedByAdminId: 'admin-1',
    });

    expect(setup.ledgerRepository.createManyLedgerEntries).not.toHaveBeenCalled();
    expect(
      setup.refreshPractitionerWalletService.refresh,
    ).toHaveBeenCalledWith('practitioner-1', expect.anything());
    expect(released.status).toBe('RELEASED');
    expect(released.releasedPractitionerAmount.toString()).toBe('0');
  });

  it('marks release-required settlements as NEEDS_REVIEW when legacy package earnings already exist', async () => {
    const readySettlement = {
      id: 'settlement-1',
      purchaseId: 'purchase-1',
      practitionerId: 'practitioner-1',
      patientId: 'patient-1',
      currencyCode: 'EGP',
      status: 'READY_TO_RELEASE',
      sessionCount: 4,
      completedSessionsCount: 4,
      heldPractitionerAmount: new Prisma.Decimal('260.00'),
      heldPlatformAmount: new Prisma.Decimal('100.00'),
      releasablePractitionerAmount: new Prisma.Decimal('260.00'),
      releasedPractitionerAmount: new Prisma.Decimal(0),
      normalEquivalentUsedAmount: new Prisma.Decimal('400.00'),
      discountAppliedAmount: new Prisma.Decimal('40.00'),
      reviewedAt: null,
      reviewedByAdminId: null,
      releasedAt: null,
      releasedByAdminId: null,
      decision: null,
      notes: null,
      metadataJson: null,
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
      updatedAt: new Date('2026-05-05T00:00:00.000Z'),
      purchase: {
        paymentId: 'payment-1',
        sessions: [
          { id: 'session-1' },
          { id: 'session-2' },
          { id: 'session-3' },
          { id: 'session-4' },
        ],
      },
    };
    const setup = buildService({
      releaseSettlement: readySettlement,
      legacyLedgerEntries: [
        {
          id: 'legacy-entry-1',
          sessionId: 'session-1',
          paymentId: 'payment-legacy',
          referenceType: 'payment',
          referenceId: 'payment-legacy',
        },
      ],
    });

    const result = await setup.service.releaseReadySettlement({
      settlementId: 'settlement-1',
      releasedByAdminId: 'admin-1',
    });

    expect(
      setup.ledgerRepository.createManyLedgerEntries,
    ).not.toHaveBeenCalled();
    expect(
      setup.refreshPractitionerWalletService.refresh,
    ).not.toHaveBeenCalled();
    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.decision).toBe('LEGACY_PACKAGE_EARNINGS_ALREADY_POSTED');
  });

  it('does not duplicate release ledger entries on replay', async () => {
    const releasedSettlement = {
      id: 'settlement-1',
      purchaseId: 'purchase-1',
      practitionerId: 'practitioner-1',
      patientId: 'patient-1',
      currencyCode: 'EGP',
      status: 'RELEASED',
      sessionCount: 4,
      completedSessionsCount: 4,
      heldPractitionerAmount: new Prisma.Decimal('260.00'),
      heldPlatformAmount: new Prisma.Decimal('100.00'),
      releasablePractitionerAmount: new Prisma.Decimal('260.00'),
      releasedPractitionerAmount: new Prisma.Decimal('260.00'),
      normalEquivalentUsedAmount: new Prisma.Decimal('400.00'),
      discountAppliedAmount: new Prisma.Decimal('40.00'),
      reviewedAt: null,
      reviewedByAdminId: null,
      releasedAt: new Date('2026-05-05T00:00:00.000Z'),
      releasedByAdminId: 'admin-1',
      decision: 'FULL_COMPLETION_ADMIN_RELEASE',
      notes: null,
      metadataJson: null,
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
      updatedAt: new Date('2026-05-05T00:00:00.000Z'),
      purchase: {
        paymentId: 'payment-1',
      },
    };
    const setup = buildService({
      releaseSettlement: releasedSettlement,
    });

    await setup.service.releaseReadySettlement({
      settlementId: 'settlement-1',
      releasedByAdminId: 'admin-1',
    });

    expect(
      setup.ledgerRepository.createManyLedgerEntries,
    ).not.toHaveBeenCalled();
    expect(
      setup.refreshPractitionerWalletService.refresh,
    ).not.toHaveBeenCalled();
  });
});
