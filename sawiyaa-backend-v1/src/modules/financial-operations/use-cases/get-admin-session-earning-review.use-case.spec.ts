import { NotFoundException } from '@nestjs/common';
import { LedgerDirection, LedgerEntryType, Prisma, SessionEarningReviewDecision, SessionEarningReviewSourceType, SessionEarningReviewStatus, SessionPaymentCoverageType, SessionStatus, WalletBalanceBucket } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { SessionEarningReviewRepository } from '../repositories/session-earning-review.repository';
import { SessionEarningReviewPresenter } from '../presenters/session-earning-review.presenter';
import { GetAdminSessionEarningReviewUseCase } from './get-admin-session-earning-review.use-case';

describe('GetAdminSessionEarningReviewUseCase', () => {
  const prisma = {
    session: {
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
    },
    ledgerEntry: {
      findMany: jest.fn(),
    },
    patientPackagePurchase: {
      findUnique: jest.fn(),
    },
    packageSettlement: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const reviewRepository = {
    findAdminReviewById: jest.fn(),
  } as unknown as SessionEarningReviewRepository;

  const paymentRepository = {
    listRefundsByPaymentId: jest.fn(),
    sumSucceededRefundAmountByPaymentId: jest.fn(),
  } as unknown as FinancialOperationsPaymentRepository;

  const presenter = new SessionEarningReviewPresenter();
  const useCase = new GetAdminSessionEarningReviewUseCase(
    prisma,
    reviewRepository,
    paymentRepository,
    presenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hydrates detail fields from payment, refund, reversal ledger, and admin reviewer context', async () => {
    (reviewRepository.findAdminReviewById as jest.Mock).mockResolvedValue({
      id: 'review-1',
      sessionId: 'session-1',
      paymentId: 'payment-1',
      packagePurchaseId: 'purchase-1',
      packageSettlementId: 'settlement-1',
      practitionerId: 'practitioner-1',
      patientId: 'patient-1',
      sourceType: SessionEarningReviewSourceType.DIRECT_SESSION,
      reviewStatus: SessionEarningReviewStatus.APPROVED,
      reviewDecision: SessionEarningReviewDecision.APPROVED_AS_IS,
      paymentAmount: new Prisma.Decimal('120.00'),
      paymentCurrencyCode: 'EGP',
      suggestedPractitionerAmount: new Prisma.Decimal('70.00'),
      suggestedPlatformAmount: new Prisma.Decimal('50.00'),
      suggestedCurrencyCode: 'EGP',
      finalPractitionerAmount: new Prisma.Decimal('65.00'),
      finalPlatformAmount: new Prisma.Decimal('55.00'),
      finalCurrencyCode: 'EGP',
      reviewedByUserId: 'admin-reviewer',
      reviewedAt: new Date('2026-07-11T10:00:00.000Z'),
      approvedByUserId: 'admin-approver',
      approvedAt: new Date('2026-07-11T10:05:00.000Z'),
      internalReason: 'Checked and approved',
      practitionerFacingNote: 'Thanks for your care.',
      createdAt: new Date('2026-07-11T09:55:00.000Z'),
      updatedAt: new Date('2026-07-11T10:05:00.000Z'),
      ledgerEntries: [
        {
          id: 'ledger-1',
          entryType: LedgerEntryType.PRACTITIONER_EARNING,
          direction: LedgerDirection.CREDIT,
          amount: new Prisma.Decimal('65.00'),
          currencyCode: 'EGP',
          balanceBucket: WalletBalanceBucket.AVAILABLE,
          referenceType: 'session_earning_review',
          referenceId: 'review-1',
          createdAt: new Date('2026-07-11T10:05:00.000Z'),
        },
      ],
    });

    (prisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-1',
      sessionCode: 'SESSION-001',
      status: SessionStatus.COMPLETED,
      paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
      scheduledStartAt: new Date('2026-07-10T10:00:00.000Z'),
      scheduledEndAt: new Date('2026-07-10T10:30:00.000Z'),
      completedAt: new Date('2026-07-10T10:35:00.000Z'),
      packagePurchaseId: 'purchase-1',
      packageSessionIndex: 1,
      packageSessionCount: 4,
      patient: {
        id: 'patient-1',
        displayName: 'Patient One',
        user: {
          displayName: 'Patient User',
        },
      },
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'practitioner-one',
        professionalTitle: 'Dr.',
        user: {
          displayName: 'Practitioner User',
        },
      },
    });

    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      status: 'CAPTURED',
      paymentPurpose: 'SESSION_BOOKING',
      provider: 'PAYMOB',
      amountTotal: new Prisma.Decimal('120.00'),
      currencyCode: 'EGP',
      providerPaymentRef: 'pay_1',
      providerOrderRef: 'ord_1',
      initiatedAt: new Date('2026-07-10T09:55:00.000Z'),
      capturedAt: new Date('2026-07-10T10:00:00.000Z'),
      failedAt: null,
      expiredAt: null,
    });

    (paymentRepository.listRefundsByPaymentId as jest.Mock).mockResolvedValue([
      {
        id: 'refund-1',
        status: 'SUCCEEDED',
        destination: 'ORIGINAL_SOURCE',
        refundReason: 'COURSE_CANCELLED',
        amount: new Prisma.Decimal('10.00'),
        currencyCode: 'EGP',
        providerRefundRef: 'rf_1',
        requestedAt: new Date('2026-07-11T08:00:00.000Z'),
        processedAt: new Date('2026-07-11T08:05:00.000Z'),
        failedAt: null,
      },
    ]);

    (paymentRepository.sumSucceededRefundAmountByPaymentId as jest.Mock).mockResolvedValue(
      {
        _sum: {
          amount: new Prisma.Decimal('10.00'),
        },
      },
    );

    (prisma.ledgerEntry.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'reversal-1',
        entryType: LedgerEntryType.REFUND_PRACTITIONER_REVERSAL,
        direction: LedgerDirection.DEBIT,
        amount: new Prisma.Decimal('65.00'),
        currencyCode: 'EGP',
        balanceBucket: WalletBalanceBucket.AVAILABLE,
        referenceType: 'refund',
        referenceId: 'refund-1',
        createdAt: new Date('2026-07-11T08:05:00.000Z'),
      },
    ]);

    (prisma.patientPackagePurchase.findUnique as jest.Mock).mockResolvedValue({
      id: 'purchase-1',
      status: 'COMPLETED',
      titleSnapshot: 'Package title',
      slugSnapshot: 'package-title',
      sessionCountSnapshot: 4,
      selectedCurrencyCode: 'EGP',
      patientPayableTotalSnapshot: new Prisma.Decimal('120.00'),
      practitionerFinalShareSnapshot: new Prisma.Decimal('70.00'),
      platformFinalShareSnapshot: new Prisma.Decimal('50.00'),
      paymentId: 'payment-1',
      packageSettlement: {
        id: 'settlement-1',
      },
    });

    (prisma.packageSettlement.findUnique as jest.Mock).mockResolvedValue({
      id: 'settlement-1',
      status: 'RELEASED',
      currencyCode: 'EGP',
      sessionCount: 4,
      completedSessionsCount: 4,
      heldPractitionerAmount: new Prisma.Decimal('70.00'),
      heldPlatformAmount: new Prisma.Decimal('50.00'),
      releasablePractitionerAmount: new Prisma.Decimal('70.00'),
      releasedPractitionerAmount: new Prisma.Decimal('70.00'),
      normalEquivalentUsedAmount: new Prisma.Decimal('0.00'),
      discountAppliedAmount: new Prisma.Decimal('0.00'),
      reviewedAt: new Date('2026-07-11T10:00:00.000Z'),
      releasedAt: new Date('2026-07-11T10:10:00.000Z'),
      decision: 'RELEASE',
      notes: 'All clear',
    });

    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'admin-reviewer',
        displayName: 'Reviewer Admin',
      },
      {
        id: 'admin-approver',
        displayName: 'Approver Admin',
      },
    ]);

    const result = await useCase.execute({
      reviewId: 'review-1',
    });

    expect(result.data.item).toEqual(
      expect.objectContaining({
        reviewId: 'review-1',
        internalReason: 'Checked and approved',
        practitionerFacingNote: 'Thanks for your care.',
        reviewedBy: {
          userId: 'admin-reviewer',
          displayName: 'Reviewer Admin',
        },
        approvedBy: {
          userId: 'admin-approver',
          displayName: 'Approver Admin',
        },
        payment: expect.objectContaining({
          paymentId: 'payment-1',
          refundedAmount: '10',
          remainingEffectiveAmount: '110',
          refunds: [
            expect.objectContaining({
              id: 'refund-1',
              status: 'SUCCEEDED',
            }),
          ],
          reversalLedgerEntries: [
            expect.objectContaining({
              id: 'reversal-1',
              entryType: LedgerEntryType.REFUND_PRACTITIONER_REVERSAL,
            }),
          ],
        }),
        ledgerEntries: [
          expect.objectContaining({
            id: 'ledger-1',
            amount: '65',
          }),
        ],
      }),
    );
  });

  it('throws a scoped not-found error when the review does not exist', async () => {
    (reviewRepository.findAdminReviewById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        reviewId: 'missing-review',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
