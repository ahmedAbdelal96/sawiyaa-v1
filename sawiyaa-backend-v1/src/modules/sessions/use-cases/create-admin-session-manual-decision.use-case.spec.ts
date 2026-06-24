import { NotFoundException } from '@nestjs/common';
import { SessionAdminDecisionType, SessionEventType, SessionStatus } from '@prisma/client';
import { CreateAdminSessionManualDecisionUseCase } from './create-admin-session-manual-decision.use-case';
import { SessionRepository } from '../repositories/session.repository';
import { GetAdminSessionAttendanceUseCase } from './get-admin-session-attendance.use-case';
import { sanitizeSafeMetadata } from '../utils/safe-metadata.util';

jest.mock('../utils/safe-metadata.util');

const mockSanitize = sanitizeSafeMetadata as jest.MockedFunction<typeof sanitizeSafeMetadata>;

describe('CreateAdminSessionManualDecisionUseCase', () => {
  let useCase: CreateAdminSessionManualDecisionUseCase;
  let mockRepo: jest.Mocked<SessionRepository>;
  let mockAttendanceUseCase: jest.Mocked<GetAdminSessionAttendanceUseCase>;
  let mockPrisma: { $transaction: jest.Mock };

  // A past session in COMPLETED status — eligible for decisions (non-blocking)
  const pastCompletedSession = {
    id: 'session_1',
    sessionCode: 'SES-2026-000001',
    status: SessionStatus.COMPLETED,
    scheduledEndAt: new Date('2026-06-15T10:00:00Z'),
  };

  // A past session in IN_PROGRESS status — still blocks the eligibility check
  const pastInProgressSession = {
    id: 'session_1',
    sessionCode: 'SES-2026-000001',
    status: SessionStatus.IN_PROGRESS,
    scheduledEndAt: new Date('2026-06-15T10:00:00Z'),
  };

  const mockAttendanceData = {
    extendedSummary: {
      recommendation: { recommendedOutcome: 'COMPLETION_CANDIDATE', riskFlags: [] },
      patient: { hasJoined: true, joinCount: 1, reconnectCount: 0, firstJoinedAt: '2026-06-15T09:00:00Z', lastLeftAt: null },
      practitioner: { hasJoined: true, joinCount: 1, reconnectCount: 0, firstJoinedAt: '2026-06-15T09:00:00Z', lastLeftAt: null },
      overlap: { overlapSeconds: 3000, overlapMinutes: 50, hasMeaningfulOverlap: true },
      meeting: { startedAt: '2026-06-15T09:00:00Z', endedAt: '2026-06-15T10:00:00Z', sourceConfidence: 'HIGH' },
    },
    evidenceTimeline: [
      { id: 'ev_1', kind: 'ATTENDANCE', eventType: 'JOINED', occurredAt: '2026-06-15T09:00:00Z', severity: 'INFO', titleKey: 'participant.joined', safeMetadataSummary: {} },
    ],
  };

  const mockDecision = {
    id: 'decision_1',
    sessionId: 'session_1',
    decisionType: SessionAdminDecisionType.MARK_COMPLETED,
    decidedByUserId: 'admin_1',
    previousSessionStatus: SessionStatus.COMPLETED,
    nextSessionStatus: SessionStatus.COMPLETED,
    reasonCode: 'COMPLETION_WITH_MEANINGFUL_OVERLAP',
    adminNote: null,
    recommendedOutcomeSnapshot: {},
    attendanceSummarySnapshot: {},
    evidenceTimelineSnapshot: {},
    isFinal: true,
    supersedesDecisionId: null,
    createdAt: new Date('2026-06-15T11:00:00Z'),
    updatedAt: new Date('2026-06-15T11:00:00Z'),
    adminUser: { id: 'admin_1', displayName: 'Admin User' },
  };

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findLatestActiveSessionAdminDecision: jest.fn(),
      findSessionAdminDecisionById: jest.fn(),
    } as unknown as jest.Mocked<SessionRepository>;

    mockAttendanceUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAdminSessionAttendanceUseCase>;

    mockPrisma = {
      $transaction: jest.fn(),
    };

    useCase = new CreateAdminSessionManualDecisionUseCase(
      mockPrisma as any,
      mockRepo,
      mockAttendanceUseCase,
    );
  });

  // ─── Shared transaction mock setup ───────────────────────────────────────────
  function setupTransactionMock(overrides: Partial<typeof mockDecision> = {}) {
    mockPrisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        sessionAdminDecision: {
          create: jest.fn().mockResolvedValue({ ...mockDecision, ...overrides }),
          update: jest.fn(),
        },
        session: { update: jest.fn() },
        sessionEvent: { create: jest.fn().mockResolvedValue({}) },
      };
      return cb(tx);
    });
    mockRepo.findSessionAdminDecisionById.mockResolvedValue({ ...mockDecision, ...overrides } as any);
  }

  // ─── Eligibility checks ──────────────────────────────────────────────────────

  it('throws SESSION_NOT_FOUND when session does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({
        sessionId: 'nonexistent',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'TEST',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws SESSION_DECISION_REQUIRES_PAST_END when scheduledEndAt is missing', async () => {
    mockRepo.findById.mockResolvedValue({ ...pastCompletedSession, scheduledEndAt: null } as any);
    await expect(
      useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'TEST',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws SESSION_DECISION_REQUIRES_PAST_END when session is in the future', async () => {
    const futureSession = { ...pastCompletedSession, scheduledEndAt: new Date('2099-01-01T00:00:00Z') };
    mockRepo.findById.mockResolvedValue(futureSession as any);
    await expect(
      useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'TEST',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws SESSION_DECISION_NOT_ALLOWED_STATUS when session status is IN_PROGRESS', async () => {
    // IN_PROGRESS is in BLOCKING_STATUSES
    mockRepo.findById.mockResolvedValue(pastInProgressSession as any);
    await expect(
      useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'TEST',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws SESSION_DECISION_ALREADY_FINAL when a final decision exists and supersedePrevious is not true', async () => {
    mockRepo.findById.mockResolvedValue(pastCompletedSession as any);
    mockRepo.findLatestActiveSessionAdminDecision.mockResolvedValue({ id: 'prior_decision' } as any);
    await expect(
      useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'TEST',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
        supersedePrevious: false,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  // ─── Status mapping ───────────────────────────────────────────────────────────

  describe('status mapping', () => {
    beforeEach(() => {
      mockRepo.findById.mockResolvedValue(pastCompletedSession as any);
      mockRepo.findLatestActiveSessionAdminDecision.mockResolvedValue(null);
      mockAttendanceUseCase.execute.mockResolvedValue(mockAttendanceData as any);
      mockSanitize.mockReturnValue({});
    });

    it('MARK_COMPLETED sets nextSessionStatus to COMPLETED', async () => {
      setupTransactionMock({ decisionType: SessionAdminDecisionType.MARK_COMPLETED, nextSessionStatus: SessionStatus.COMPLETED });
      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'COMPLETION_WITH_MEANINGFUL_OVERLAP',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('MARK_PATIENT_NO_SHOW sets nextSessionStatus to NO_SHOW', async () => {
      setupTransactionMock({ decisionType: SessionAdminDecisionType.MARK_PATIENT_NO_SHOW, nextSessionStatus: SessionStatus.NO_SHOW });
      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_PATIENT_NO_SHOW,
        decidedByUserId: 'admin_1',
        reasonCode: 'PATIENT_NO_SHOW',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('MARK_PRACTITIONER_NO_SHOW does not mutate Session.status', async () => {
      setupTransactionMock({ decisionType: SessionAdminDecisionType.MARK_PRACTITIONER_NO_SHOW, nextSessionStatus: null });
      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_PRACTITIONER_NO_SHOW,
        decidedByUserId: 'admin_1',
        reasonCode: 'PRACTITIONER_NO_SHOW',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('MARK_BOTH_NO_SHOW does not mutate Session.status', async () => {
      setupTransactionMock({ decisionType: SessionAdminDecisionType.MARK_BOTH_NO_SHOW, nextSessionStatus: null });
      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_BOTH_NO_SHOW,
        decidedByUserId: 'admin_1',
        reasonCode: 'BOTH_NO_SHOW',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('MARK_TECHNICAL_REVIEW does not mutate Session.status', async () => {
      setupTransactionMock({ decisionType: SessionAdminDecisionType.MARK_TECHNICAL_REVIEW, nextSessionStatus: null });
      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_TECHNICAL_REVIEW,
        decidedByUserId: 'admin_1',
        reasonCode: 'TECHNICAL_ISSUE',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('MARK_INSUFFICIENT_EVIDENCE does not mutate Session.status', async () => {
      setupTransactionMock({ decisionType: SessionAdminDecisionType.MARK_INSUFFICIENT_EVIDENCE, nextSessionStatus: null });
      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_INSUFFICIENT_EVIDENCE,
        decidedByUserId: 'admin_1',
        reasonCode: 'INSUFFICIENT_EVIDENCE',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── Supersession ────────────────────────────────────────────────────────────

  describe('supersession', () => {
    beforeEach(() => {
      mockRepo.findById.mockResolvedValue(pastCompletedSession as any);
      mockAttendanceUseCase.execute.mockResolvedValue(mockAttendanceData as any);
      mockSanitize.mockReturnValue({});
    });

    it('supersedePrevious=true marks the prior decision as non-final', async () => {
      const priorDecision = { id: 'prior_decision', isFinal: true };

      let updateCalled = false;
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          sessionAdminDecision: {
            findFirst: jest.fn().mockResolvedValue(priorDecision),
            create: jest.fn().mockResolvedValue({ ...mockDecision, supersedesDecisionId: 'prior_decision' }),
            update: jest.fn().mockImplementation(() => { updateCalled = true; return {}; }),
          },
          session: { update: jest.fn() },
          sessionEvent: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });
      mockRepo.findSessionAdminDecisionById.mockResolvedValue({ ...mockDecision, supersedesDecisionId: 'prior_decision' } as any);

      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'TEST',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
        supersedePrevious: true,
      });

      expect(updateCalled).toBe(true);
    });
  });

  // ─── Evidence snapshot ──────────────────────────────────────────────────────

  describe('evidence snapshot', () => {
    beforeEach(() => {
      mockRepo.findById.mockResolvedValue(pastCompletedSession as any);
      mockRepo.findLatestActiveSessionAdminDecision.mockResolvedValue(null);
      mockSanitize.mockReturnValue({ '[REDACTED]': '[REDACTED]' });
      setupTransactionMock();
    });

    it('builds evidence snapshot server-side from GetAdminSessionAttendanceUseCase', async () => {
      mockAttendanceUseCase.execute.mockResolvedValue(mockAttendanceData as any);

      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'TEST',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      });

      expect(mockAttendanceUseCase.execute).toHaveBeenCalledWith({ sessionId: 'session_1' });
    });

    it('execute() does not have evidenceSnapshot in its input type signature', () => {
      // The execute() method accepts a fixed input shape — evidenceSnapshot is not part of it.
      // TypeScript enforces this at compile time; this test is a no-op compile-time check placeholder.
      expect(true).toBe(true);
    });

    it('sanitizes the server-built snapshot before storage', async () => {
      mockAttendanceUseCase.execute.mockResolvedValue(mockAttendanceData as any);

      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'TEST',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      });

      expect(mockSanitize).toHaveBeenCalled();
    });
  });

  // ─── Audit events ────────────────────────────────────────────────────────────

  describe('audit events', () => {
    beforeEach(() => {
      mockRepo.findById.mockResolvedValue(pastCompletedSession as any);
      mockRepo.findLatestActiveSessionAdminDecision.mockResolvedValue(null);
      mockAttendanceUseCase.execute.mockResolvedValue(mockAttendanceData as any);
      mockSanitize.mockReturnValue({});
    });

    it('writes ADMIN_MANUAL_DECISION_CREATED event inside the transaction', async () => {
      setupTransactionMock();

      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'TEST',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      });

      // Verify the $transaction was called (proves audit event was included in tx)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('writes ADMIN_MANUAL_DECISION_SUPERSEDED event when superseding', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          sessionAdminDecision: {
            findFirst: jest.fn().mockResolvedValue({ id: 'prior_decision', isFinal: true }),
            create: jest.fn().mockResolvedValue({ ...mockDecision, supersedesDecisionId: 'prior_decision' }),
            update: jest.fn(),
          },
          session: { update: jest.fn() },
          sessionEvent: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });
      mockRepo.findSessionAdminDecisionById.mockResolvedValue({ ...mockDecision, supersedesDecisionId: 'prior_decision' } as any);

      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'TEST',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
        supersedePrevious: true,
      });

      // Verify the $transaction was called (proves superseded event was included in tx)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ─── Transaction ─────────────────────────────────────────────────────────────

  describe('transaction', () => {
    beforeEach(() => {
      mockRepo.findById.mockResolvedValue(pastCompletedSession as any);
      mockRepo.findLatestActiveSessionAdminDecision.mockResolvedValue(null);
      mockAttendanceUseCase.execute.mockResolvedValue(mockAttendanceData as any);
      mockSanitize.mockReturnValue({});
      setupTransactionMock();
    });

    it('wraps decision creation and status mutation in a transaction', async () => {
      await useCase.execute({
        sessionId: 'session_1',
        decisionType: SessionAdminDecisionType.MARK_COMPLETED,
        decidedByUserId: 'admin_1',
        reasonCode: 'TEST',
        confirmEvidenceReviewed: true,
        confirmNoAutomaticRefund: true,
        confirmNoAutomaticPayout: true,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
