import { ForbiddenException } from '@nestjs/common';
import { SessionEventType, SessionStatus } from '@prisma/client';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { ValidateSessionStatusTransitionService } from '../services/validate-session-status-transition.service';
import { MarkSessionCompletedByPractitionerUseCase } from './mark-session-completed-by-practitioner.use-case';
import { PostPackageSessionLedgerEntriesUseCase } from '@modules/financial-operations/use-cases/post-package-session-ledger-entries.use-case';

describe('MarkSessionCompletedByPractitionerUseCase', () => {
  it('marks owned session as completed and emits completion event', async () => {
    const practitionerRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'practitioner-1' }),
    } as unknown as SessionPractitionerRepository;

    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.IN_PROGRESS,
        sessionCode: 'SES-2026-000001',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        practitioner: { id: 'practitioner-1' },
      }),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.COMPLETED,
        sessionCode: 'SES-2026-000001',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        scheduledStartAt: null,
        scheduledEndAt: null,
        durationMinutes: 60,
        sessionMode: 'VIDEO',
        flowType: 'SCHEDULED',
        expiresAt: null,
        cancelledAt: null,
        cancellationReason: null,
        completedAt: new Date('2026-01-01T00:00:00.000Z'),
        expiredAt: null,
        timezoneSnapshot: 'Africa/Cairo',
        practitioner: {
          id: 'practitioner-1',
          publicSlug: 'dr-one',
          user: { displayName: 'Dr One' },
        },
        patient: {
          id: 'patient-1',
          user: { displayName: 'Patient One' },
        },
      }),
      createEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as SessionRepository;

    const transitionService = {
      assertCanTransition: jest.fn(),
    } as unknown as ValidateSessionStatusTransitionService;
    const postPackageSessionLedgerEntriesUseCase = {
      execute: jest.fn().mockResolvedValue({ wasAlreadyPosted: true }),
    } as unknown as PostPackageSessionLedgerEntriesUseCase;

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: (...args: any[]) => any) => fn({})),
    } as never;

    const useCase = new MarkSessionCompletedByPractitionerUseCase(
      prisma,
      practitionerRepository,
      sessionRepository,
      new SessionMapper(),
      transitionService,
      postPackageSessionLedgerEntriesUseCase,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      sessionId: 'session-1',
    });

    expect(result.item.status).toBe(SessionStatus.COMPLETED);
    expect(transitionService.assertCanTransition).toHaveBeenCalledWith(
      SessionStatus.IN_PROGRESS,
      SessionStatus.COMPLETED,
    );
    expect(
      (sessionRepository.createEvent as jest.Mock).mock.calls[0][0].eventType,
    ).toBe(SessionEventType.SESSION_COMPLETED);
    expect(
      (postPackageSessionLedgerEntriesUseCase.execute as jest.Mock).mock
        .calls[0][0],
    ).toEqual(
      expect.objectContaining({
        sessionId: 'session-1',
      }),
    );
  });

  it('rejects non-owned session mutation', async () => {
    const practitionerRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'practitioner-1' }),
    } as unknown as SessionPractitionerRepository;

    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.IN_PROGRESS,
        sessionCode: 'SES-2026-000001',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        practitioner: { id: 'practitioner-2' },
      }),
    } as unknown as SessionRepository;

    const transitionService = {
      assertCanTransition: jest.fn(),
    } as unknown as ValidateSessionStatusTransitionService;
    const postPackageSessionLedgerEntriesUseCase = {
      execute: jest.fn().mockResolvedValue({ wasAlreadyPosted: true }),
    } as unknown as PostPackageSessionLedgerEntriesUseCase;

    const prisma = {
      $transaction: jest.fn(),
    } as never;

    const useCase = new MarkSessionCompletedByPractitionerUseCase(
      prisma,
      practitionerRepository,
      sessionRepository,
      new SessionMapper(),
      transitionService,
      postPackageSessionLedgerEntriesUseCase,
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        sessionId: 'session-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
