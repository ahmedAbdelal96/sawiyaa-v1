import { NotFoundException } from '@nestjs/common';
import { SessionAdminDecisionType, SessionStatus } from '@prisma/client';
import { ListAdminSessionManualDecisionsUseCase } from './list-admin-session-manual-decisions.use-case';
import { SessionRepository } from '../repositories/session.repository';

describe('ListAdminSessionManualDecisionsUseCase', () => {
  let useCase: ListAdminSessionManualDecisionsUseCase;
  let mockRepo: jest.Mocked<SessionRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      listSessionAdminDecisionsBySessionId: jest.fn(),
    } as unknown as jest.Mocked<SessionRepository>;
    useCase = new ListAdminSessionManualDecisionsUseCase(mockRepo);
  });

  const session = { id: 'session_1', sessionCode: 'SES-2026-000001' };

  const decisions = [
    {
      id: 'decision_2',
      sessionId: 'session_1',
      decisionType: SessionAdminDecisionType.MARK_BOTH_NO_SHOW,
      decidedByUserId: 'admin_1',
      previousSessionStatus: SessionStatus.IN_PROGRESS,
      nextSessionStatus: null,
      reasonCode: 'BOTH_NO_SHOW',
      adminNote: 'Neither party joined.',
      recommendedOutcomeSnapshot: null,
      attendanceSummarySnapshot: null,
      evidenceTimelineSnapshot: null,
      isFinal: true,
      supersedesDecisionId: 'decision_1',
      createdAt: new Date('2026-06-15T11:00:00Z'),
      updatedAt: new Date('2026-06-15T11:00:00Z'),
      adminUser: { id: 'admin_1', displayName: 'Admin User' },
    },
    {
      id: 'decision_1',
      sessionId: 'session_1',
      decisionType: SessionAdminDecisionType.MARK_PATIENT_NO_SHOW,
      decidedByUserId: 'admin_1',
      previousSessionStatus: SessionStatus.IN_PROGRESS,
      nextSessionStatus: SessionStatus.NO_SHOW,
      reasonCode: 'PATIENT_NO_SHOW',
      adminNote: 'Patient did not join.',
      recommendedOutcomeSnapshot: { recommendedOutcome: 'NO_SHOW', riskFlags: [] },
      attendanceSummarySnapshot: { patient: { hasJoined: false }, practitioner: { hasJoined: true } },
      evidenceTimelineSnapshot: [],
      isFinal: false,
      supersedesDecisionId: null,
      createdAt: new Date('2026-06-15T10:00:00Z'),
      updatedAt: new Date('2026-06-15T10:00:00Z'),
      adminUser: { id: 'admin_1', displayName: 'Admin User' },
    },
  ];

  it('throws NotFoundException when session does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ sessionId: 'nonexistent' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns decisions sorted by createdAt desc with totalCount', async () => {
    mockRepo.findById.mockResolvedValue(session as any);
    mockRepo.listSessionAdminDecisionsBySessionId.mockResolvedValue(decisions as any);

    const result = await useCase.execute({ sessionId: 'session_1' });

    expect(result.items).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    expect(result.items[0].id).toBe('decision_2');
    expect(result.items[1].id).toBe('decision_1');
  });

  it('maps decidedBy to actor DTO correctly', async () => {
    mockRepo.findById.mockResolvedValue(session as any);
    mockRepo.listSessionAdminDecisionsBySessionId.mockResolvedValue([decisions[0]] as any);

    const result = await useCase.execute({ sessionId: 'session_1' });

    expect(result.items[0].decidedBy).toEqual({
      userId: 'admin_1',
      displayName: 'Admin User',
    });
  });

  it('maps new contract fields: previousSessionStatus, nextSessionStatus, isFinal, supersedesDecisionId, reasonCode, adminNote', async () => {
    mockRepo.findById.mockResolvedValue(session as any);
    mockRepo.listSessionAdminDecisionsBySessionId.mockResolvedValue([decisions[1]] as any);

    const result = await useCase.execute({ sessionId: 'session_1' });

    expect(result.items[0]).toMatchObject({
      id: 'decision_1',
      previousSessionStatus: SessionStatus.IN_PROGRESS,
      nextSessionStatus: SessionStatus.NO_SHOW,
      isFinal: false,
      supersedesDecisionId: null,
      reasonCode: 'PATIENT_NO_SHOW',
      adminNote: 'Patient did not join.',
    });
  });

  it('maps snapshot fields as typed objects', async () => {
    mockRepo.findById.mockResolvedValue(session as any);
    mockRepo.listSessionAdminDecisionsBySessionId.mockResolvedValue([decisions[1]] as any);

    const result = await useCase.execute({ sessionId: 'session_1' });

    expect(result.items[0].recommendedOutcomeSnapshot).toEqual({ recommendedOutcome: 'NO_SHOW', riskFlags: [] });
    expect(result.items[0].attendanceSummarySnapshot).toEqual({ patient: { hasJoined: false }, practitioner: { hasJoined: true } });
    expect(result.items[0].evidenceTimelineSnapshot).toEqual([]);
  });

  it('maps supersedesDecisionId when superseding', async () => {
    mockRepo.findById.mockResolvedValue(session as any);
    mockRepo.listSessionAdminDecisionsBySessionId.mockResolvedValue([decisions[0]] as any);

    const result = await useCase.execute({ sessionId: 'session_1' });

    expect(result.items[0].supersedesDecisionId).toBe('decision_1');
  });

  it('returns empty list when no decisions exist', async () => {
    mockRepo.findById.mockResolvedValue(session as any);
    mockRepo.listSessionAdminDecisionsBySessionId.mockResolvedValue([]);

    const result = await useCase.execute({ sessionId: 'session_1' });

    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });
});
