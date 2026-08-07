import { LedgerDirection, LedgerEntryType, Prisma, WalletBalanceBucket } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CalculatePackageSessionAllocationService } from './calculate-package-session-allocation.service';
import { ExtractPaymentLedgerBreakdownService } from './extract-payment-ledger-breakdown.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { RefreshPractitionerWalletService } from './refresh-practitioner-wallet.service';
import { SessionEarningReviewService } from './session-earning-review.service';
import { ApprovePractitionerSettlementService } from './approve-practitioner-settlement.service';

describe('SessionEarningReviewService', () => {
  function buildService() {
    const tx = {
      sessionEarningReview: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      ledgerEntry: {
        findMany: jest.fn(),
        createMany: jest.fn(),
      },
      session: {
        findUnique: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
      },
      patientPackagePurchase: {
        findUnique: jest.fn(),
      },
      practitionerSettlement: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    };

    const prisma = {} as PrismaService;
    const ledgerRepository = new LedgerRepository(prisma);
    ledgerRepository.createManyLedgerEntries = jest
      .fn()
      .mockResolvedValue({ count: 2 });
    const extractPaymentLedgerBreakdownService = {
      extract: jest.fn(),
    } as unknown as ExtractPaymentLedgerBreakdownService;
    const calculatePackageSessionAllocationService = {
      allocate: jest.fn(),
    } as unknown as CalculatePackageSessionAllocationService;
    const approvePractitionerSettlementService = {
      approveAndCredit: jest.fn().mockResolvedValue({ id: 'settlement-1' }),
    } as unknown as ApprovePractitionerSettlementService;

    const service = new SessionEarningReviewService(
      prisma,
      ledgerRepository,
      extractPaymentLedgerBreakdownService,
      calculatePackageSessionAllocationService,
      { refresh: jest.fn() } as unknown as RefreshPractitionerWalletService,
      approvePractitionerSettlementService,
    );

    return {
      service,
      tx,
      ledgerRepository,
      extractPaymentLedgerBreakdownService,
      calculatePackageSessionAllocationService,
      approvePractitionerSettlementService,
    };
  }

  it.each([
    ['completed session without captured payment', 'COMPLETED', null],
    ['cancelled session with captured payment', 'CANCELLED', { id: 'payment-1', status: 'CAPTURED' }],
  ])('does not create an earning review for a %s', async (_label, status, payment) => {
    const { service, tx } = buildService();
    tx.session.findUnique.mockResolvedValue({
      id: 'session-edge', status, patientId: 'patient-1', practitionerId: 'practitioner-1',
      packagePurchaseId: null, packageSessionIndex: null, packageSessionCount: null,
    });
    tx.payment.findFirst.mockResolvedValue(payment);
    const result = await service.syncForSessionCompletion({ sessionId: 'session-edge', tx: tx as never });
    expect(result).toBeNull();
    expect(tx.sessionEarningReview.upsert).not.toHaveBeenCalled();
  });

  it('creates one pending direct-session review from a completed captured session', async () => {
    const {
      service,
      tx,
      extractPaymentLedgerBreakdownService,
    } = buildService();

    tx.session.findUnique.mockResolvedValue({
      id: 'session-1',
      status: 'COMPLETED',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      packagePurchaseId: null,
      packageSessionIndex: null,
      packageSessionCount: null,
    });
    tx.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      status: 'CAPTURED',
      amountTotal: new Prisma.Decimal('100'),
      currencyCode: 'USD',
      metadataJson: {
        commissionPlatformRatePercent: 30,
      },
      commissionPlatformRatePercent: new Prisma.Decimal('30'),
    });
    (extractPaymentLedgerBreakdownService as { extract: jest.Mock }).extract.mockReturnValue({
      practitionerShareAmount: new Prisma.Decimal('70'),
      platformCommissionAmount: new Prisma.Decimal('30'),
      currencyCode: 'USD',
    });
    tx.ledgerEntry.findMany.mockResolvedValue([]);
    tx.sessionEarningReview.findUnique.mockResolvedValue(null);
    tx.sessionEarningReview.upsert.mockImplementation(async (args) => ({
      id: 'review-1',
      ...args.create,
    }));

    const result = await service.syncForSessionCompletion({
      sessionId: 'session-1',
      tx: tx as never,
    });

    expect(result).toEqual({
      reviewId: 'review-1',
      reviewStatus: 'PENDING_REVIEW',
      reviewDecision: 'AUTO_CREATED',
      sourceType: 'DIRECT_SESSION',
      wasAlreadySynced: false,
    });
    expect(tx.sessionEarningReview.upsert).toHaveBeenCalledTimes(1);
    expect(tx.sessionEarningReview.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sessionId_sourceType: {
            sessionId: 'session-1',
            sourceType: 'DIRECT_SESSION',
          },
        },
        create: expect.objectContaining({
          sessionId: 'session-1',
          paymentId: 'payment-1',
          reviewStatus: 'PENDING_REVIEW',
          reviewDecision: 'AUTO_CREATED',
          paymentAmount: new Prisma.Decimal('100'),
          paymentCurrencyCode: 'USD',
           suggestedPractitionerAmount: new Prisma.Decimal('0'),
           suggestedPlatformAmount: new Prisma.Decimal('100'),
          suggestedCurrencyCode: 'USD',
          finalPractitionerAmount: null,
          finalPlatformAmount: null,
          finalCurrencyCode: null,
          idempotencyKey: 'session-earning-review:DIRECT_SESSION:session-1',
        }),
      }),
    );
  });

  it('returns the existing direct-session review without duplicating it on replay', async () => {
    const {
      service,
      tx,
      extractPaymentLedgerBreakdownService,
    } = buildService();
    tx.session.findUnique.mockResolvedValue({
      id: 'session-1',
      status: 'COMPLETED',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      packagePurchaseId: null,
      packageSessionIndex: null,
      packageSessionCount: null,
    });
    tx.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      status: 'CAPTURED',
      amountTotal: new Prisma.Decimal('100'),
      currencyCode: 'USD',
      metadataJson: {},
      commissionPlatformRatePercent: new Prisma.Decimal('30'),
    });
    (extractPaymentLedgerBreakdownService as { extract: jest.Mock }).extract.mockReturnValue({
      practitionerShareAmount: new Prisma.Decimal('70'),
      platformCommissionAmount: new Prisma.Decimal('30'),
      currencyCode: 'USD',
    });
    tx.ledgerEntry.findMany.mockResolvedValue([]);
    tx.sessionEarningReview.findUnique.mockResolvedValue({
      id: 'review-1',
      reviewStatus: 'PENDING_REVIEW',
      reviewDecision: 'AUTO_CREATED',
      sourceType: 'DIRECT_SESSION',
    });

    const result = await service.syncForSessionCompletion({
      sessionId: 'session-1',
      tx: tx as never,
    });

    expect(result).toEqual({
      reviewId: 'review-1',
      reviewStatus: 'PENDING_REVIEW',
      reviewDecision: 'AUTO_CREATED',
      sourceType: 'DIRECT_SESSION',
      wasAlreadySynced: true,
    });
    expect(tx.sessionEarningReview.upsert).not.toHaveBeenCalled();
  });

  it('creates one pending package-session review from a completed captured session', async () => {
    const {
      service,
      tx,
      calculatePackageSessionAllocationService,
    } = buildService();

    tx.session.findUnique.mockResolvedValue({
      id: 'session-2',
      status: 'COMPLETED',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      packagePurchaseId: 'purchase-1',
      packageSessionIndex: 2,
      packageSessionCount: 4,
    });
    tx.patientPackagePurchase.findUnique.mockResolvedValue({
      id: 'purchase-1',
      selectedCurrencyCode: 'EGP',
      payment: {
        id: 'payment-2',
        status: 'CAPTURED',
        amountTotal: new Prisma.Decimal('400'),
        currencyCode: 'EGP',
        metadataJson: null,
        commissionPlatformRatePercent: null,
      },
      packageSettlement: {
        id: 'settlement-1',
      },
      sessionCountSnapshot: 4,
      patientPayableTotalSnapshot: new Prisma.Decimal('400'),
      platformFinalShareSnapshot: new Prisma.Decimal('80'),
      practitionerFinalShareSnapshot: new Prisma.Decimal('320'),
      platformOriginalShareSnapshot: new Prisma.Decimal('80'),
      practitionerOriginalShareSnapshot: new Prisma.Decimal('320'),
      platformDiscountShareSnapshot: new Prisma.Decimal('0'),
      practitionerDiscountShareSnapshot: new Prisma.Decimal('0'),
      discountAmountSnapshot: new Prisma.Decimal('0'),
    });
    (calculatePackageSessionAllocationService as { allocate: jest.Mock }).allocate.mockReturnValue({
      patientPayableAmount: new Prisma.Decimal('400'),
      practitionerFinalShareAmount: new Prisma.Decimal('320'),
      platformFinalShareAmount: new Prisma.Decimal('80'),
    });
    tx.ledgerEntry.findMany.mockResolvedValue([]);
    tx.sessionEarningReview.findUnique.mockResolvedValue(null);
    tx.sessionEarningReview.upsert.mockImplementation(async (args) => ({
      id: 'review-2',
      ...args.create,
    }));

    const result = await service.syncForSessionCompletion({
      sessionId: 'session-2',
      tx: tx as never,
    });

    expect(result).toEqual({
      reviewId: 'review-2',
      reviewStatus: 'PENDING_REVIEW',
      reviewDecision: 'AUTO_CREATED',
      sourceType: 'PACKAGE_SESSION',
      wasAlreadySynced: false,
    });
    expect(tx.sessionEarningReview.upsert).toHaveBeenCalledTimes(1);
    expect(tx.sessionEarningReview.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          sessionId: 'session-2',
          paymentId: 'payment-2',
          packagePurchaseId: 'purchase-1',
          packageSettlementId: 'settlement-1',
          reviewStatus: 'PENDING_REVIEW',
          reviewDecision: 'AUTO_CREATED',
          paymentAmount: new Prisma.Decimal('400'),
          paymentCurrencyCode: 'EGP',
          suggestedPractitionerAmount: new Prisma.Decimal('320'),
          suggestedPlatformAmount: new Prisma.Decimal('80'),
          suggestedCurrencyCode: 'EGP',
          idempotencyKey: 'session-earning-review:PACKAGE_SESSION:session-2',
        }),
      }),
    );
  });

  it('returns the existing package-session review without duplicating it on replay', async () => {
    const {
      service,
      tx,
      calculatePackageSessionAllocationService,
    } = buildService();
    tx.session.findUnique.mockResolvedValue({
      id: 'session-2',
      status: 'COMPLETED',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      packagePurchaseId: 'purchase-1',
      packageSessionIndex: 2,
      packageSessionCount: 4,
    });
    tx.patientPackagePurchase.findUnique.mockResolvedValue({
      id: 'purchase-1',
      selectedCurrencyCode: 'EGP',
      payment: {
        id: 'payment-2',
        status: 'CAPTURED',
        amountTotal: new Prisma.Decimal('400'),
        currencyCode: 'EGP',
        metadataJson: null,
        commissionPlatformRatePercent: null,
      },
      packageSettlement: {
        id: 'settlement-1',
      },
      sessionCountSnapshot: 4,
      patientPayableTotalSnapshot: new Prisma.Decimal('400'),
      platformFinalShareSnapshot: new Prisma.Decimal('80'),
      practitionerFinalShareSnapshot: new Prisma.Decimal('320'),
      platformOriginalShareSnapshot: new Prisma.Decimal('80'),
      practitionerOriginalShareSnapshot: new Prisma.Decimal('320'),
      platformDiscountShareSnapshot: new Prisma.Decimal('0'),
      practitionerDiscountShareSnapshot: new Prisma.Decimal('0'),
      discountAmountSnapshot: new Prisma.Decimal('0'),
    });
    (calculatePackageSessionAllocationService as { allocate: jest.Mock }).allocate.mockReturnValue({
      patientPayableAmount: new Prisma.Decimal('400'),
      practitionerFinalShareAmount: new Prisma.Decimal('320'),
      platformFinalShareAmount: new Prisma.Decimal('80'),
    });
    tx.ledgerEntry.findMany.mockResolvedValue([]);
    tx.sessionEarningReview.findUnique.mockResolvedValue({
      id: 'review-2',
      reviewStatus: 'PENDING_REVIEW',
      reviewDecision: 'AUTO_CREATED',
      sourceType: 'PACKAGE_SESSION',
    });

    const result = await service.syncForSessionCompletion({
      sessionId: 'session-2',
      tx: tx as never,
    });

    expect(result).toEqual({
      reviewId: 'review-2',
      reviewStatus: 'PENDING_REVIEW',
      reviewDecision: 'AUTO_CREATED',
      sourceType: 'PACKAGE_SESSION',
      wasAlreadySynced: true,
    });
    expect(tx.sessionEarningReview.upsert).not.toHaveBeenCalled();
  });

  it('creates one pending package-session review from a package entitlement decision', async () => {
    const {
      service,
      tx,
      calculatePackageSessionAllocationService,
    } = buildService();

    tx.session.findUnique.mockResolvedValue({
      id: 'session-3',
      status: 'NO_SHOW',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      packagePurchaseId: 'purchase-1',
      packageSessionIndex: 2,
      packageSessionCount: 4,
    });
    tx.patientPackagePurchase.findUnique.mockResolvedValue({
      id: 'purchase-1',
      selectedCurrencyCode: 'EGP',
      payment: {
        id: 'payment-3',
        status: 'CAPTURED',
        amountTotal: new Prisma.Decimal('400'),
        currencyCode: 'EGP',
        metadataJson: null,
        commissionPlatformRatePercent: null,
      },
      packageSettlement: {
        id: 'settlement-1',
      },
      sessionCountSnapshot: 4,
      patientPayableTotalSnapshot: new Prisma.Decimal('400'),
      platformFinalShareSnapshot: new Prisma.Decimal('80'),
      practitionerFinalShareSnapshot: new Prisma.Decimal('320'),
      platformOriginalShareSnapshot: new Prisma.Decimal('80'),
      practitionerOriginalShareSnapshot: new Prisma.Decimal('320'),
      platformDiscountShareSnapshot: new Prisma.Decimal('0'),
      practitionerDiscountShareSnapshot: new Prisma.Decimal('0'),
      discountAmountSnapshot: new Prisma.Decimal('0'),
    });
    (calculatePackageSessionAllocationService as { allocate: jest.Mock }).allocate.mockReturnValue({
      patientPayableAmount: new Prisma.Decimal('400'),
      practitionerFinalShareAmount: new Prisma.Decimal('320'),
      platformFinalShareAmount: new Prisma.Decimal('80'),
    });
    tx.sessionEarningReview.findUnique.mockResolvedValue(null);
    tx.sessionEarningReview.upsert.mockImplementation(async (args) => ({
      id: 'review-3',
      ...args.create,
    }));

    const result = await service.syncForPackageEntitlementDecision({
      sessionId: 'session-3',
      tx: tx as never,
    });

    expect(result).toEqual({
      reviewId: 'review-3',
      reviewStatus: 'PENDING_REVIEW',
      reviewDecision: 'AUTO_CREATED',
      sourceType: 'PACKAGE_SESSION',
      wasAlreadySynced: false,
    });
    expect(tx.sessionEarningReview.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sessionId_sourceType: {
            sessionId: 'session-3',
            sourceType: 'PACKAGE_SESSION',
          },
        },
        create: expect.objectContaining({
          sessionId: 'session-3',
          paymentId: 'payment-3',
          packagePurchaseId: 'purchase-1',
          packageSettlementId: 'settlement-1',
          reviewStatus: 'PENDING_REVIEW',
          reviewDecision: 'AUTO_CREATED',
          paymentAmount: new Prisma.Decimal('400'),
          paymentCurrencyCode: 'EGP',
          suggestedPractitionerAmount: new Prisma.Decimal('320'),
          suggestedPlatformAmount: new Prisma.Decimal('80'),
          suggestedCurrencyCode: 'EGP',
          idempotencyKey: 'session-earning-review:PACKAGE_SESSION:session-3',
        }),
      }),
    );
  });

  it('returns the existing package-session review without duplicating it on package entitlement replay', async () => {
    const {
      service,
      tx,
      calculatePackageSessionAllocationService,
    } = buildService();
    tx.session.findUnique.mockResolvedValue({
      id: 'session-3',
      status: 'NO_SHOW',
      patientId: 'patient-1',
      practitionerId: 'practitioner-1',
      packagePurchaseId: 'purchase-1',
      packageSessionIndex: 2,
      packageSessionCount: 4,
    });
    tx.patientPackagePurchase.findUnique.mockResolvedValue({
      id: 'purchase-1',
      selectedCurrencyCode: 'EGP',
      payment: {
        id: 'payment-3',
        status: 'CAPTURED',
        amountTotal: new Prisma.Decimal('400'),
        currencyCode: 'EGP',
        metadataJson: null,
        commissionPlatformRatePercent: null,
      },
      packageSettlement: {
        id: 'settlement-1',
      },
      sessionCountSnapshot: 4,
      patientPayableTotalSnapshot: new Prisma.Decimal('400'),
      platformFinalShareSnapshot: new Prisma.Decimal('80'),
      practitionerFinalShareSnapshot: new Prisma.Decimal('320'),
      platformOriginalShareSnapshot: new Prisma.Decimal('80'),
      practitionerOriginalShareSnapshot: new Prisma.Decimal('320'),
      platformDiscountShareSnapshot: new Prisma.Decimal('0'),
      practitionerDiscountShareSnapshot: new Prisma.Decimal('0'),
      discountAmountSnapshot: new Prisma.Decimal('0'),
    });
    (calculatePackageSessionAllocationService as { allocate: jest.Mock }).allocate.mockReturnValue({
      patientPayableAmount: new Prisma.Decimal('400'),
      practitionerFinalShareAmount: new Prisma.Decimal('320'),
      platformFinalShareAmount: new Prisma.Decimal('80'),
    });
    tx.sessionEarningReview.findUnique.mockResolvedValue({
      id: 'review-3',
      reviewStatus: 'PENDING_REVIEW',
      reviewDecision: 'AUTO_CREATED',
      sourceType: 'PACKAGE_SESSION',
    });

    const result = await service.syncForPackageEntitlementDecision({
      sessionId: 'session-3',
      tx: tx as never,
    });

    expect(result).toEqual({
      reviewId: 'review-3',
      reviewStatus: 'PENDING_REVIEW',
      reviewDecision: 'AUTO_CREATED',
      sourceType: 'PACKAGE_SESSION',
      wasAlreadySynced: true,
    });
    expect(tx.sessionEarningReview.upsert).not.toHaveBeenCalled();
  });

  it('fails closed for finalized approvals through the legacy method', async () => {
    const { service, tx, ledgerRepository } = buildService();
    const existingReview = {
      id: 'review-1',
      paymentId: 'payment-1',
      reviewStatus: 'APPROVED',
      reviewDecision: 'APPROVED_AS_IS',
      sourceType: 'DIRECT_SESSION',
    };
    tx.sessionEarningReview.findUnique.mockResolvedValue(existingReview);

    await expect(service.approveReview({
      reviewId: 'review-1',
      reviewerUserId: 'admin-1',
      action: 'APPROVE_AS_IS',
      tx: tx as never,
    })).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'LEGACY_COMBINED_APPROVAL_DISABLED' }),
    });
    expect(tx.sessionEarningReview.update).not.toHaveBeenCalled();
    expect(ledgerRepository.createManyLedgerEntries).not.toHaveBeenCalled();
  });

  it('invalidates pending reviews when a payment is refunded before approval', async () => {
    const { service, tx } = buildService();
    tx.sessionEarningReview.findMany.mockResolvedValue([
      { id: 'review-1', sessionId: 'session-1' },
    ]);
    tx.sessionEarningReview.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.invalidatePendingReviewsForPayment({
      paymentId: 'payment-1',
      internalReason: 'PAYMENT_REFUNDED_BEFORE_REVIEW_APPROVAL',
      tx: tx as never,
    });

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.sessionEarningReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentId: 'payment-1',
          reviewStatus: 'PENDING_REVIEW',
        }),
      }),
    );
    expect(tx.sessionEarningReview.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: {
            in: ['review-1'],
          },
        }),
        data: expect.objectContaining({
          reviewStatus: 'EXCLUDED_FROM_PAYOUT',
          reviewDecision: 'EXCLUDED_FROM_PAYOUT',
        }),
      }),
    );
    expect(tx.practitionerSettlement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sourceReviewId: { in: ['review-1'] },
          status: 'UNDER_REVIEW',
        }),
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectionReason: 'PAYMENT_REFUNDED_BEFORE_REVIEW_APPROVAL',
        }),
      }),
    );
    expect(result).toEqual({
      updatedCount: 1,
      reviewIds: ['review-1'],
    });
  });

  it('records a system audit event when refund auto-rejects an under-review settlement', async () => {
    const { tx } = buildService();
    const audit = { recordRequired: jest.fn().mockResolvedValue(undefined) };
    const service = new SessionEarningReviewService(
      {} as PrismaService,
      {} as LedgerRepository,
      {} as ExtractPaymentLedgerBreakdownService,
      {} as CalculatePackageSessionAllocationService,
      {} as RefreshPractitionerWalletService,
      {} as ApprovePractitionerSettlementService,
      undefined,
      audit as never,
    );

    tx.sessionEarningReview.findMany.mockResolvedValue([
      { id: 'review-1', sessionId: 'session-1' },
    ]);
    tx.practitionerSettlement.findMany.mockResolvedValue([
      {
        id: 'settlement-1',
        sourceReviewId: 'review-1',
        status: 'UNDER_REVIEW',
        finalWalletCredit: new Prisma.Decimal('650.00'),
        walletCurrencyCode: 'EGP',
      },
    ]);

    await service.invalidatePendingReviewsForPayment({
      paymentId: 'payment-1',
      internalReason: 'PAYMENT_REFUNDED_BEFORE_REVIEW_APPROVAL',
      tx: tx as never,
    });

    expect(audit.recordRequired).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'SETTLEMENT_AUTO_REJECTED_REFUND',
        actorType: 'SYSTEM',
        resourceType: 'PractitionerSettlement',
        resourceId: 'settlement-1',
        metadata: expect.objectContaining({
          settlementId: 'settlement-1',
          sessionId: 'session-1',
          reviewId: 'review-1',
          paymentId: 'payment-1',
          previousSettlementStatus: 'UNDER_REVIEW',
          newSettlementStatus: 'REJECTED',
          previousReviewStatus: 'PENDING_REVIEW',
          newReviewStatus: 'EXCLUDED_FROM_PAYOUT',
          amount: '650',
          currency: 'EGP',
          referenceType: 'PAYMENT',
          referenceId: 'payment-1',
        }),
      }),
    );
  });

  it('does not create the auto-rejection event when no review is pending', async () => {
    const { tx } = buildService();
    const audit = { recordRequired: jest.fn().mockResolvedValue(undefined) };
    const service = new SessionEarningReviewService(
      {} as PrismaService,
      {} as LedgerRepository,
      {} as ExtractPaymentLedgerBreakdownService,
      {} as CalculatePackageSessionAllocationService,
      {} as RefreshPractitionerWalletService,
      {} as ApprovePractitionerSettlementService,
      undefined,
      audit as never,
    );

    tx.sessionEarningReview.findMany.mockResolvedValue([]);

    await service.invalidatePendingReviewsForPayment({
      paymentId: 'payment-after-payout',
      tx: tx as never,
    });

    expect(audit.recordRequired).not.toHaveBeenCalled();
  });

  it('fails closed when a legacy approval attempts to post ledger effects', async () => {
    const { service, approvePractitionerSettlementService } = buildService();

    await expect(service.approveReview({
      reviewId: 'review-1',
      reviewerUserId: 'admin-1',
      action: 'APPROVE_AS_IS',
    })).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'LEGACY_COMBINED_APPROVAL_DISABLED' }),
    });
    expect(approvePractitionerSettlementService.approveAndCredit).not.toHaveBeenCalled();
  });
});
