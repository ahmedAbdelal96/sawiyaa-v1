import { Prisma, SessionEarningReviewDecision, SessionEarningReviewSourceType, SessionEarningReviewStatus, SessionPaymentCoverageType, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { SessionEarningReviewRepository } from '../repositories/session-earning-review.repository';
import { SessionEarningReviewPresenter } from '../presenters/session-earning-review.presenter';
import { ListAdminSessionEarningReviewsUseCase } from './list-admin-session-earning-reviews.use-case';

describe('ListAdminSessionEarningReviewsUseCase', () => {
  const prisma = {
    session: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    patientPackagePurchase: {
      findMany: jest.fn(),
    },
    packageSettlement: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    practitionerProfile: {
      findMany: jest.fn(),
    },
    patientProfile: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const reviewRepository = {
    listAdminReviews: jest.fn(),
  } as unknown as SessionEarningReviewRepository;

  const paymentRepository = {
    sumSucceededRefundAmountsByPaymentIds: jest.fn(),
  } as unknown as FinancialOperationsPaymentRepository;

  const presenter = new SessionEarningReviewPresenter();
  const useCase = new ListAdminSessionEarningReviewsUseCase(
    prisma,
    reviewRepository,
    paymentRepository,
    presenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to the pending moderation queue and hydrates payment refund summary', async () => {
    (reviewRepository.listAdminReviews as jest.Mock).mockResolvedValue([
      [
        {
          id: 'review-1',
          sessionId: 'session-1',
          paymentId: 'payment-1',
          packagePurchaseId: null,
          packageSettlementId: null,
          practitionerId: 'practitioner-1',
          patientId: 'patient-1',
          sourceType: SessionEarningReviewSourceType.DIRECT_SESSION,
          reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
          reviewDecision: SessionEarningReviewDecision.AUTO_CREATED,
          paymentAmount: new Prisma.Decimal('120.00'),
          paymentCurrencyCode: 'EGP',
          suggestedPractitionerAmount: new Prisma.Decimal('70.00'),
          suggestedPlatformAmount: new Prisma.Decimal('50.00'),
          suggestedCurrencyCode: 'EGP',
          finalPractitionerAmount: null,
          finalPlatformAmount: null,
          finalCurrencyCode: null,
          reviewedByUserId: 'admin-1',
          reviewedAt: null,
          approvedByUserId: null,
          approvedAt: null,
          internalReason: null,
          practitionerFacingNote: null,
          createdAt: new Date('2026-07-11T10:00:00.000Z'),
          updatedAt: new Date('2026-07-11T10:00:00.000Z'),
        },
      ],
      1,
    ]);

    (prisma.session.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'session-1',
        sessionCode: 'SESSION-001',
        status: SessionStatus.COMPLETED,
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
        scheduledStartAt: new Date('2026-07-10T10:00:00.000Z'),
        scheduledEndAt: new Date('2026-07-10T10:30:00.000Z'),
        completedAt: new Date('2026-07-10T10:35:00.000Z'),
        packagePurchaseId: null,
        packageSessionIndex: null,
        packageSessionCount: null,
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
      },
    ]);

    (prisma.payment.findMany as jest.Mock).mockResolvedValue([
      {
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
      },
    ]);

    (paymentRepository.sumSucceededRefundAmountsByPaymentIds as jest.Mock).mockResolvedValue([
      {
        paymentId: 'payment-1',
        _sum: {
          amount: new Prisma.Decimal('10.00'),
        },
      },
    ]);

    (prisma.patientPackagePurchase.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.packageSettlement.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'admin-1',
        displayName: 'Finance Admin',
      },
    ]);

    const result = await useCase.execute({
      query: {
        page: 1,
        limit: 20,
      } as never,
    });

    expect(reviewRepository.listAdminReviews).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            expect.objectContaining({
              reviewStatus: SessionEarningReviewStatus.PENDING_REVIEW,
            }),
          ],
        },
        skip: 0,
        take: 20,
      }),
    );
    expect(paymentRepository.sumSucceededRefundAmountsByPaymentIds).toHaveBeenCalledWith([
      'payment-1',
    ]);
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0]).toEqual(
      expect.objectContaining({
        reviewId: 'review-1',
        isActionRequired: true,
        isFinalized: false,
        reviewedBy: {
          userId: 'admin-1',
          displayName: 'Finance Admin',
        },
        payment: expect.objectContaining({
          paymentId: 'payment-1',
          refundedAmount: '10',
          remainingEffectiveAmount: '110',
        }),
        session: expect.objectContaining({
          sessionId: 'session-1',
          sessionCode: 'SESSION-001',
        }),
      }),
    );
  });

  it('switches to the finalized queue when requested', async () => {
    (reviewRepository.listAdminReviews as jest.Mock).mockResolvedValue([[], 0]);
    (prisma.session.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);
    (paymentRepository.sumSucceededRefundAmountsByPaymentIds as jest.Mock).mockResolvedValue([]);
    (prisma.patientPackagePurchase.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.packageSettlement.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await useCase.execute({
      query: {
        page: 1,
        limit: 10,
        finalized: true,
      } as never,
    });

    expect(reviewRepository.listAdminReviews).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            expect.objectContaining({
              reviewStatus: {
                in: [
                  SessionEarningReviewStatus.APPROVED,
                  SessionEarningReviewStatus.REJECTED,
                  SessionEarningReviewStatus.EXCLUDED_FROM_PAYOUT,
                ],
              },
            }),
          ],
        },
        orderBy: [
          { reviewedAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
      }),
    );
  });
});
