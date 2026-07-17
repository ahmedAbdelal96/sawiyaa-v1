import { Prisma, SessionEventType, SessionStatus } from '@prisma/client';
import { SessionLifecycleService } from './session-lifecycle.service';
import { ValidateSessionStatusTransitionService } from './validate-session-status-transition.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';

describe('SessionLifecycleService', () => {
  const updateStatus = jest.fn();
  const createEvent = jest.fn();
  const repository = { updateStatus, createEvent } as never;
  const service = new SessionLifecycleService(
    repository,
    new ValidateSessionStatusTransitionService(),
  );
  const tx = {} as Prisma.TransactionClient;

  beforeEach(() => {
    jest.clearAllMocks();
    updateStatus.mockImplementation(async (id: string, data: { status: SessionStatus }) => ({
      id,
      status: data.status,
    }));
    createEvent.mockResolvedValue(undefined);
  });

  it('writes the canonical status and an event in the supplied transaction', async () => {
    await service.transition({
      session: { id: 'session-1', status: SessionStatus.PENDING_PAYMENT },
      to: SessionStatus.UPCOMING,
      tx,
    });

    expect(updateStatus).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ status: SessionStatus.UPCOMING }),
      tx,
    );
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        eventType: SessionEventType.SESSION_CONFIRMED,
        metadataJson: expect.objectContaining({
          previousStatus: SessionStatus.PENDING_PAYMENT,
          nextStatus: SessionStatus.UPCOMING,
        }),
      }),
      tx,
    );
  });

  it('sets completedAt only for a canonical completion transition', async () => {
    const completedAt = new Date('2026-07-15T10:00:00.000Z');

    await service.transition({
      session: {
        id: 'session-1',
        status: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      },
      to: SessionStatus.COMPLETED,
      at: completedAt,
      tx,
    });

    expect(updateStatus).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({
        status: SessionStatus.COMPLETED,
        completedAt,
      }),
      tx,
    );
  });

  it('persists explicit actor context and status snapshots on lifecycle events', async () => {
    await service.transition({
      session: { id: 'session-1', status: SessionStatus.UPCOMING },
      to: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
      actorType: SecurityAuditActorType.SCHEDULED_JOB,
      source: SecurityAuditSource.SCHEDULED_JOB,
      reason: 'scheduled_end_elapsed',
      at: new Date('2026-07-15T10:00:00.000Z'),
      tx,
    });

    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: SecurityAuditActorType.SCHEDULED_JOB,
        source: SecurityAuditSource.SCHEDULED_JOB,
        reason: 'scheduled_end_elapsed',
        previousStatus: SessionStatus.UPCOMING,
        newStatus: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        occurredAt: new Date('2026-07-15T10:00:00.000Z'),
      }),
      tx,
    );
  });

  it('propagates event-write failure so the surrounding transaction can roll back status', async () => {
    createEvent.mockRejectedValueOnce(new Error('event-write-failed'));

    await expect(
      service.transition({
        session: { id: 'session-1', status: SessionStatus.UPCOMING },
        to: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        tx,
      }),
    ).rejects.toThrow('event-write-failed');
  });
});
