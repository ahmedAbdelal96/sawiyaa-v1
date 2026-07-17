import { ConflictException, NotFoundException } from '@nestjs/common';
import { SessionEventType, SessionPaymentCoverageType, SessionStatus } from '@prisma/client';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { CreateAdminSessionPackageEntitlementDecisionUseCase } from './create-admin-session-package-entitlement-decision.use-case';
import { SessionRepository } from '../repositories/session.repository';
import { PrismaService } from '@common/prisma/prisma.service';

describe('CreateAdminSessionPackageEntitlementDecisionUseCase', () => {
  let useCase: CreateAdminSessionPackageEntitlementDecisionUseCase;
  let mockPrisma: {
    sessionPackageEntitlementDecision: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    sessionEvent: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
    };
    let mockRepo: jest.Mocked<SessionRepository>;
    let mockSessionEarningReviewService: jest.Mocked<SessionEarningReviewService>;
    let transactionSessionEventCreate: jest.Mock;
    let transactionExecuteRaw: jest.Mock;

  const packageSession = {
    id: 'session_1',
    patientId: 'patient_1',
    practitionerId: 'practitioner_1',
    status: SessionStatus.CANCELLED,
    paymentCoverageType: SessionPaymentCoverageType.PACKAGE,
    packagePurchaseId: 'purchase_1',
  };

  const packageDecision = {
    id: 'decision_1',
    sessionId: 'session_1',
    packagePurchaseId: 'purchase_1',
    patientId: 'patient_1',
    practitionerId: 'practitioner_1',
    sessionStatusSnapshot: SessionStatus.CANCELLED,
    decisionType: 'RESTORE_TO_PACKAGE',
    reasonCode: 'PATIENT_FAULT',
    adminNote: null,
    decidedByUserId: 'admin_1',
    decidedAt: new Date('2026-07-01T10:00:00Z'),
    idempotencyKey: 'idem-1',
    resultingSessionEarningReviewId: null,
    decidedByUser: {
      id: 'admin_1',
      displayName: 'Admin User',
    },
  };

  beforeEach(() => {
    mockPrisma = {
      sessionPackageEntitlementDecision: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      sessionEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockRepo = {
      findByIdWithParticipants: jest.fn(),
    } as unknown as jest.Mocked<SessionRepository>;
    mockSessionEarningReviewService = {
      syncForPackageEntitlementDecision: jest.fn(),
    } as unknown as jest.Mocked<SessionEarningReviewService>;

    useCase = new CreateAdminSessionPackageEntitlementDecisionUseCase(
      mockPrisma as unknown as PrismaService,
      mockRepo,
      mockSessionEarningReviewService,
    );
  });

  function setupTransaction(createdDecision = packageDecision) {
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      transactionSessionEventCreate = jest.fn().mockResolvedValue({});
      transactionExecuteRaw = jest.fn().mockResolvedValue(1);
      const tx = {
        sessionPackageEntitlementDecision: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(createdDecision),
        },
        sessionEvent: {
          create: transactionSessionEventCreate,
        },
        $executeRaw: transactionExecuteRaw,
      };
      return callback(tx as any);
    });
  }

  it('creates a package entitlement decision and records an audit event', async () => {
    mockRepo.findByIdWithParticipants.mockResolvedValue(packageSession as any);
    mockPrisma.sessionPackageEntitlementDecision.findUnique.mockResolvedValue(null);
    setupTransaction();

    const result = await useCase.execute({
      sessionId: 'session_1',
      decidedByUserId: 'admin_1',
      decisionType: 'RESTORE_TO_PACKAGE',
      reasonCode: 'PATIENT_FAULT',
      adminNote: 'Reviewed by finance',
      idempotencyKey: 'idem-1',
    });

    expect(result.id).toBe('decision_1');
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(transactionSessionEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: SessionEventType.ADMIN_MANUAL_DECISION_CREATED,
        metadataJson: expect.objectContaining({
          decisionScope: 'PACKAGE_ENTITLEMENT',
          decisionType: 'RESTORE_TO_PACKAGE',
          reasonCode: 'PATIENT_FAULT',
          packagePurchaseId: 'purchase_1',
          idempotencyKey: 'idem-1',
        }),
      }),
    });
    expect(transactionExecuteRaw).toHaveBeenCalled();
    expect(
      mockSessionEarningReviewService.syncForPackageEntitlementDecision,
    ).not.toHaveBeenCalled();
  });

  it('creates a package session earning review when the decision counts the session as used', async () => {
    mockRepo.findByIdWithParticipants.mockResolvedValue(packageSession as any);
    mockPrisma.sessionPackageEntitlementDecision.findUnique.mockResolvedValue(null);
    mockSessionEarningReviewService.syncForPackageEntitlementDecision.mockResolvedValue({
      reviewId: 'review_1',
      reviewStatus: 'PENDING_REVIEW',
      reviewDecision: 'AUTO_CREATED',
      sourceType: 'PACKAGE_SESSION',
      wasAlreadySynced: false,
    });
    setupTransaction({
      ...packageDecision,
      decisionType: 'COUNT_AS_USED',
      resultingSessionEarningReviewId: 'review_1',
    });

    const result = await useCase.execute({
      sessionId: 'session_1',
      decidedByUserId: 'admin_1',
      decisionType: 'COUNT_AS_USED',
      reasonCode: 'PATIENT_NO_SHOW',
      adminNote: null,
      idempotencyKey: 'idem-count',
    });

    expect(mockSessionEarningReviewService.syncForPackageEntitlementDecision).toHaveBeenCalledWith(
      {
        sessionId: 'session_1',
        tx: expect.any(Object),
      },
    );
    expect(transactionSessionEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadataJson: expect.objectContaining({
          decisionType: 'COUNT_AS_USED',
          resultingSessionEarningReviewId: 'review_1',
        }),
      }),
    });
    expect(result.resultingSessionEarningReviewId).toBe('review_1');
  });

  it('rejects count-as-used decisions when the accounting review cannot be created', async () => {
    mockRepo.findByIdWithParticipants.mockResolvedValue(packageSession as any);
    mockPrisma.sessionPackageEntitlementDecision.findUnique.mockResolvedValue(null);
    mockSessionEarningReviewService.syncForPackageEntitlementDecision.mockResolvedValue(null);
    setupTransaction();

    await expect(
      useCase.execute({
        sessionId: 'session_1',
        decidedByUserId: 'admin_1',
        decisionType: 'COUNT_AS_USED',
        reasonCode: 'PATIENT_NO_SHOW',
        adminNote: null,
        idempotencyKey: 'idem-count-fail',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects sessions that are not package-covered', async () => {
    mockRepo.findByIdWithParticipants.mockResolvedValue({
      ...packageSession,
      paymentCoverageType: SessionPaymentCoverageType.SELF_PAY,
      packagePurchaseId: null,
    } as any);

    await expect(
      useCase.execute({
        sessionId: 'session_1',
        decidedByUserId: 'admin_1',
        decisionType: 'RESTORE_TO_PACKAGE',
        reasonCode: 'PATIENT_FAULT',
        adminNote: null,
        idempotencyKey: 'idem-2',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects sessions that are not cancelled or no-show', async () => {
    mockRepo.findByIdWithParticipants.mockResolvedValue({
      ...packageSession,
      status: SessionStatus.COMPLETED,
    } as any);

    await expect(
      useCase.execute({
        sessionId: 'session_1',
        decidedByUserId: 'admin_1',
        decisionType: 'RESTORE_TO_PACKAGE',
        reasonCode: 'PATIENT_FAULT',
        adminNote: null,
        idempotencyKey: 'idem-3',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects practitioner-fault count-as-used combinations', async () => {
    mockRepo.findByIdWithParticipants.mockResolvedValue(packageSession as any);

    await expect(
      useCase.execute({
        sessionId: 'session_1',
        decidedByUserId: 'admin_1',
        decisionType: 'COUNT_AS_USED',
        reasonCode: 'PRACTITIONER_FAULT',
        adminNote: null,
        idempotencyKey: 'idem-4',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the existing decision when the same idempotency key is replayed', async () => {
    mockRepo.findByIdWithParticipants.mockResolvedValue(packageSession as any);
    mockPrisma.sessionPackageEntitlementDecision.findUnique.mockResolvedValue(packageDecision as any);

    const result = await useCase.execute({
      sessionId: 'session_1',
      decidedByUserId: 'admin_1',
      decisionType: 'RESTORE_TO_PACKAGE',
      reasonCode: 'PATIENT_FAULT',
      adminNote: null,
      idempotencyKey: 'idem-1',
    });

    expect(result.id).toBe('decision_1');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a second decision with a different idempotency key', async () => {
    mockRepo.findByIdWithParticipants.mockResolvedValue(packageSession as any);
    mockPrisma.sessionPackageEntitlementDecision.findUnique.mockResolvedValue(packageDecision as any);

    await expect(
      useCase.execute({
        sessionId: 'session_1',
        decidedByUserId: 'admin_1',
        decisionType: 'COUNT_AS_USED',
        reasonCode: 'PATIENT_NO_SHOW',
        adminNote: null,
        idempotencyKey: 'idem-2',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when the session cannot be found', async () => {
    mockRepo.findByIdWithParticipants.mockResolvedValue(null);

    await expect(
      useCase.execute({
        sessionId: 'missing',
        decidedByUserId: 'admin_1',
        decisionType: 'RESTORE_TO_PACKAGE',
        reasonCode: 'PATIENT_FAULT',
        adminNote: null,
        idempotencyKey: 'idem-5',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
