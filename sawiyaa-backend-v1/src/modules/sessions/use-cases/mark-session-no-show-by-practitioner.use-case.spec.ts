import { ConflictException, SessionEventType, SessionStatus } from '@prisma/client';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SessionLifecycleService } from '../services/session-lifecycle.service';
import { MarkSessionNoShowByPractitionerUseCase } from './mark-session-no-show-by-practitioner.use-case';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

describe('MarkSessionNoShowByPractitionerUseCase', () => {
  it('marks owned session as no-show and emits patient-no-show event', async () => {
    const practitionerRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'practitioner-1' }),
    } as unknown as SessionPractitionerRepository;

    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.UPCOMING,
        practitioner: {
          id: 'practitioner-1',
          publicSlug: 'dr-one',
          user: { displayName: 'Dr One' },
        },
        patient: {
          id: 'patient-1',
          user: { displayName: 'Patient One' },
        },
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        scheduledStartAt: null,
        scheduledEndAt: null,
        durationMinutes: 60,
        sessionMode: 'VIDEO',
        flowType: 'SCHEDULED',
        expiresAt: null,
        cancelledAt: null,
        cancellationReason: null,
        completedAt: null,
        expiredAt: null,
        timezoneSnapshot: 'Africa/Cairo',
      }),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.PATIENT_NO_SHOW,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        scheduledStartAt: null,
        scheduledEndAt: null,
        durationMinutes: 60,
        sessionMode: 'VIDEO',
        flowType: 'SCHEDULED',
        expiresAt: null,
        cancelledAt: null,
        cancellationReason: null,
        completedAt: null,
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
      transition: jest.fn().mockImplementation(async ({ session, to }: any) => {
        await (sessionRepository.createEvent as jest.Mock)({ eventType: SessionEventType.NO_SHOW_PATIENT });
        return { ...session, status: to };
      }),
    } as unknown as SessionLifecycleService;
    const operationalNotificationService = {
      cancelSessionReminders: jest.fn().mockResolvedValue(undefined),
    } as unknown as OperationalNotificationService;

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: (...args: any[]) => any) => fn({})),
    } as never;

    const useCase = new MarkSessionNoShowByPractitionerUseCase(
      prisma,
      practitionerRepository,
      sessionRepository,
      new SessionMapper(),
      transitionService,
      operationalNotificationService,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      sessionId: 'session-1',
    });

    expect(result.item.status).toBe(SessionStatus.PATIENT_NO_SHOW);
    expect(transitionService.transition).toHaveBeenCalledWith(
      expect.objectContaining({ to: SessionStatus.PATIENT_NO_SHOW }),
    );
    expect(
      (sessionRepository.createEvent as jest.Mock).mock.calls[0][0].eventType,
    ).toBe(SessionEventType.NO_SHOW_PATIENT);
    expect(
      (operationalNotificationService.cancelSessionReminders as jest.Mock),
    ).toHaveBeenCalledWith({
      sessionId: 'session-1',
      cancelledAt: expect.any(Date),
    });
  });

  it('rejects repeating no-show marks cleanly without writing another event', async () => {
    const practitionerRepository = {
      findByUserId: jest.fn().mockResolvedValue({ id: 'practitioner-1' }),
    } as unknown as SessionPractitionerRepository;

    const sessionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'session-1',
        status: SessionStatus.PATIENT_NO_SHOW,
        practitioner: { id: 'practitioner-1' },
      }),
      updateStatus: jest.fn(),
      createEvent: jest.fn(),
    } as unknown as SessionRepository;

    const transitionService = {
      transition: jest.fn(),
    } as unknown as SessionLifecycleService;
    const operationalNotificationService = {
      cancelSessionReminders: jest.fn(),
    } as unknown as OperationalNotificationService;

    const prisma = {
      $transaction: jest.fn(),
    } as never;

    const useCase = new MarkSessionNoShowByPractitionerUseCase(
      prisma,
      practitionerRepository,
      sessionRepository,
      new SessionMapper(),
      transitionService,
      operationalNotificationService,
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        sessionId: 'session-1',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'SESSION_ALREADY_NO_SHOW',
        messageKey: 'sessions.errors.sessionAlreadyNoShow',
      }),
    });

    expect(transitionService.transition).not.toHaveBeenCalled();
    expect(sessionRepository.updateStatus).not.toHaveBeenCalled();
    expect(sessionRepository.createEvent).not.toHaveBeenCalled();
    expect(operationalNotificationService.cancelSessionReminders).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
