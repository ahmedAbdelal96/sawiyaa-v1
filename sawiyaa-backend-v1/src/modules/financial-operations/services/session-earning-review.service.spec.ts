import { LedgerDirection, LedgerEntryType, Prisma, WalletBalanceBucket } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CalculatePackageSessionAllocationService } from './calculate-package-session-allocation.service';
import { ExtractPaymentLedgerBreakdownService } from './extract-payment-ledger-breakdown.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { RefreshPractitionerWalletService } from './refresh-practitioner-wallet.service';
import { SessionEarningReviewService } from './session-earning-review.service';

describe('SessionEarningReviewService', () => {
  function buildService() {
    const tx = {
      sessionEarningReview: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
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

    const service = new SessionEarningReviewService(
      prisma,
      ledgerRepository,
      extractPaymentLedgerBreakdownService,
      calculatePackageSessionAllocationService,
      { refresh: jest.fn() } as unknown as RefreshPractitionerWalletService,
    );

    return {
      service,
      tx,
      ledgerRepository,
      extractPaymentLedgerBreakdownService,
      calculatePackageSessionAllocationService,
    };
  }

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
          suggestedPractitionerAmount: new Prisma.Decimal('70'),
          suggestedPlatformAmount: new Prisma.Decimal('30'),
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

  it('keeps finalized approvals idempotent without rewriting the record', async () => {
    const { service, tx, ledgerRepository } = buildService();
    const existingReview = {
      id: 'review-1',
      paymentId: 'payment-1',
      reviewStatus: 'APPROVED',
      reviewDecision: 'APPROVED_AS_IS',
      sourceType: 'DIRECT_SESSION',
    };
    tx.sessionEarningReview.findUnique.mockResolvedValue(existingReview);

    const result = await service.approveReview({
      reviewId: 'review-1',
      reviewerUserId: 'admin-1',
      action: 'APPROVE_AS_IS',
      tx: tx as never,
    });

    expect(result).toEqual({
      item: existingReview,
      wasAlreadyPosted: true,
    });
    expect(tx.sessionEarningReview.update).not.toHaveBeenCalled();
    expect(ledgerRepository.createManyLedgerEntries).not.toHaveBeenCalled();
  });

  it('invalidates pending reviews when a payment is refunded before approval', async () => {
    const { service, tx } = buildService();
    tx.sessionEarningReview.findMany.mockResolvedValue([{ id: 'review-1' }]);
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
    expect(result).toEqual({
      updatedCount: 1,
      reviewIds: ['review-1'],
    });
  });

  it('reconciles pending approvals from the posted ledger rows', async () => {
    const { service, tx, ledgerRepository } = buildService();
    tx.sessionEarningReview.findUnique.mockResolvedValue({
      id: 'review-1',
      reviewStatus: 'PENDING_REVIEW',
      reviewDecision: 'AUTO_CREATED',
      sourceType: 'DIRECT_SESSION',
      practitionerId: 'practitioner-1',
      sessionId: 'session-1',
      paymentId: 'payment-1',
      suggestedPractitionerAmount: new Prisma.Decimal('1.00'),
      suggestedPlatformAmount: new Prisma.Decimal('1.00'),
      suggestedCurrencyCode: 'USD',
      ledgerEntries: [],
    });
    tx.ledgerEntry.findMany.mockResolvedValue([
      {
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: LedgerDirection.CREDIT,
        amount: new Prisma.Decimal('70.00'),
        currencyCode: 'USD',
      },
      {
        entryType: LedgerEntryType.PLATFORM_COMMISSION,
        direction: LedgerDirection.CREDIT,
        amount: new Prisma.Decimal('30.00'),
        currencyCode: 'USD',
      },
    ]);
    tx.sessionEarningReview.update.mockImplementation(async (args) => ({
      id: 'review-1',
      ...args.data,
    }));

    const result = await service.approveReview({
      reviewId: 'review-1',
      reviewerUserId: 'admin-1',
      action: 'APPROVE_AS_IS',
      tx: tx as never,
    });

    expect(ledgerRepository.createManyLedgerEntries).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          sessionEarningReviewId: 'review-1',
          entryType: LedgerEntryType.PRACTITIONER_EARNING,
          direction: LedgerDirection.CREDIT,
          balanceBucket: WalletBalanceBucket.AVAILABLE,
        }),
      ]),
      tx,
      true,
    );
    const updateArgs = tx.sessionEarningReview.update.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: 'review-1' });
    expect(updateArgs.data.reviewStatus).toBe('APPROVED');
    expect(updateArgs.data.finalPractitionerAmount.toString()).toBe('70');
    expect(updateArgs.data.finalPlatformAmount.toString()).toBe('30');
    expect(updateArgs.data.finalCurrencyCode).toBe('USD');
    expect(updateArgs.data.approvedByUserId).toBe('admin-1');
    expect(result.item.finalPractitionerAmount.toString()).toBe('70');
    expect(result.item.finalPlatformAmount.toString()).toBe('30');
    expect(result.item.finalCurrencyCode).toBe('USD');
  });
});
