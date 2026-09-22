import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { ResolveSessionJoinReadinessService } from './resolve-session-join-readiness.service';
import { SessionOperationalInterpreterService } from './session-operational-interpreter.service';

describe('SessionOperationalInterpreterService', () => {
  const now = new Date('2026-08-08T10:00:00.000Z');
  const patientActions = {
    resolveOne: jest.fn().mockResolvedValue({
      canCancel: true,
      canPrepareRoom: true,
      canJoin: true,
      canPay: false,
      canReview: false,
    }),
  };
  const joinReadiness = new ResolveSessionJoinReadinessService({
    get: jest.fn().mockReturnValue(24 * 60),
  } as never);
  const service = new SessionOperationalInterpreterService(
    joinReadiness,
    patientActions as never,
  );

  const baseSession = {
    id: 'session_1',
    status: SessionStatus.READY_TO_JOIN,
    flowType: 'DIRECT',
    sessionMode: SessionMode.VIDEO,
    scheduledStartAt: new Date('2026-08-08T09:50:00.000Z'),
    scheduledEndAt: new Date('2026-08-08T10:50:00.000Z'),
    joinOpenAt: new Date('2026-08-08T09:35:00.000Z'),
    joinCloseAt: new Date('2026-08-08T11:05:00.000Z'),
    expiresAt: null,
    provider: SessionProvider.DAILY,
    providerRoomId: 'room_1',
    providerSessionRef: 'ref_1',
    videoRoomClosedAt: null,
    originalSessionId: null,
  };

  it.each([
    ['upcoming outside join window', { status: SessionStatus.UPCOMING, scheduledStartAt: new Date('2026-08-08T11:00:00.000Z'), scheduledEndAt: new Date('2026-08-08T12:00:00.000Z'), joinOpenAt: new Date('2026-08-08T10:45:00.000Z') }, SessionStatus.UPCOMING, false],
    ['ready to join', {}, SessionStatus.READY_TO_JOIN, true],
    ['in progress', { status: SessionStatus.IN_PROGRESS }, SessionStatus.IN_PROGRESS, true],
    ['completed', { status: SessionStatus.COMPLETED }, SessionStatus.COMPLETED, false],
    ['cancelled', { status: SessionStatus.CANCELLED }, SessionStatus.CANCELLED, false],
    ['patient no-show', { status: SessionStatus.PATIENT_NO_SHOW }, SessionStatus.PATIENT_NO_SHOW, false],
    ['practitioner no-show', { status: SessionStatus.PRACTITIONER_NO_SHOW }, SessionStatus.PRACTITIONER_NO_SHOW, false],
    ['awaiting admin resolution', { status: SessionStatus.AWAITING_ADMIN_RESOLUTION }, SessionStatus.AWAITING_ADMIN_RESOLUTION, false],
    ['room closed unresolved', { videoRoomClosedAt: now }, SessionStatus.AWAITING_ADMIN_RESOLUTION, false],
    ['patient trusted attendance with a conflicting claim', { status: SessionStatus.IN_PROGRESS }, SessionStatus.IN_PROGRESS, true],
    ['uncertain attendance', { status: SessionStatus.AWAITING_ADMIN_RESOLUTION }, SessionStatus.AWAITING_ADMIN_RESOLUTION, false],
    ['replacement session', { status: SessionStatus.UPCOMING, originalSessionId: 'replaced_session' }, SessionStatus.UPCOMING, true],
    ['rescheduled session', { status: SessionStatus.UPCOMING, scheduledStartAt: new Date('2026-08-08T09:55:00.000Z') }, SessionStatus.UPCOMING, true],
    ['expired', { status: SessionStatus.EXPIRED }, SessionStatus.EXPIRED, false],
  ])('interprets %s deterministically', async (_name, patch, expectedState, expectedJoin) => {
    const result = await service.interpret({
      actor: 'PRACTITIONER',
      now,
      session: { ...baseSession, ...patch } as never,
      attendance: _name.includes('trusted')
        ? { patientTrustedAttendance: true, practitionerTrustedAttendance: false, reconciliationStatus: 'CONFIRMED' }
        : _name.includes('uncertain')
          ? { patientTrustedAttendance: false, practitionerTrustedAttendance: false, reconciliationStatus: 'UNCERTAIN' }
          : undefined,
    });

    expect(result.state).toBe(expectedState);
    expect(result.join.allowed).toBe(expectedJoin);
    expect(result.resolution.required).toBe(expectedState === SessionStatus.AWAITING_ADMIN_RESOLUTION);
  });

  it('keeps shared truth constant while exposing actor-specific actions', async () => {
    const [patient, practitioner, admin] = await Promise.all([
      service.interpret({ actor: 'PATIENT', now, session: baseSession as never }),
      service.interpret({ actor: 'PRACTITIONER', now, session: baseSession as never }),
      service.interpret({ actor: 'ADMIN', now, session: baseSession as never }),
    ]);

    expect([patient.state, practitioner.state, admin.state]).toEqual([
      SessionStatus.READY_TO_JOIN,
      SessionStatus.READY_TO_JOIN,
      SessionStatus.READY_TO_JOIN,
    ]);
    expect(patient.actions.canCancel).toBe(true);
    expect(practitioner.actions.canJoin).toBe(true);
    expect(admin.actions.canJoin).toBe(false);
  });

  it('keeps the complete shared operational contract aligned across actors', async () => {
    const [patient, practitioner, admin] = await Promise.all([
      service.interpret({ actor: 'PATIENT', now, session: baseSession as never }),
      service.interpret({ actor: 'PRACTITIONER', now, session: baseSession as never }),
      service.interpret({ actor: 'ADMIN', now, session: baseSession as never }),
    ]);

    const shared = (value: typeof patient) => ({
      state: value.state,
      timelineBucket: value.timelineBucket,
      join: value.join,
      room: value.room,
      resolution: value.resolution,
      replacement: value.replacement,
    });

    expect(shared(patient)).toEqual(shared(practitioner));
    expect(shared(patient)).toEqual(shared(admin));
    expect(patient.join.opensAt).toEqual(baseSession.joinOpenAt);
    expect(patient.join.closesAt).toEqual(baseSession.joinCloseAt);
  });

  it('does not make a technically closed room joinable while lifecycle facts look active', async () => {
    const result = await service.interpret({
      actor: 'PRACTITIONER',
      now,
      session: { ...baseSession, status: SessionStatus.IN_PROGRESS, videoRoomClosedAt: now } as never,
    });

    expect(result.join).toMatchObject({ allowed: false, reasonCode: 'SESSION_ROOM_CLOSED' });
    expect(result.room).toEqual({ state: 'CLOSED', closedAt: now });
    expect(result.resolution.required).toBe(true);
  });

  it('does not expose an expired persisted READY_TO_JOIN row as actionable', async () => {
    const result = await service.interpret({
      actor: 'PATIENT',
      now: new Date('2026-08-10T10:00:00.000Z'),
      session: {
        ...baseSession,
        status: SessionStatus.READY_TO_JOIN,
        scheduledStartAt: new Date('2026-08-08T09:50:00.000Z'),
        scheduledEndAt: new Date('2026-08-08T10:50:00.000Z'),
        joinOpenAt: new Date('2026-08-08T09:35:00.000Z'),
        joinCloseAt: new Date('2026-08-08T11:05:00.000Z'),
      } as never,
    });

    expect(result.state).toBe(SessionStatus.AWAITING_COMPLETION_CONFIRMATION);
    expect(result.join.allowed).toBe(false);
    expect(result.join.reasonCode).toBe('SESSION_JOIN_WINDOW_CLOSED');
  });

  it('preserves cancellation policy output and has no write or financial dependency', async () => {
    const result = await service.interpret({ actor: 'PATIENT', now, session: baseSession as never });

    expect(result.actions.canCancel).toBe(true);
    expect(patientActions.resolveOne).toHaveBeenCalledWith(expect.objectContaining({ now }));
    expect(Object.keys(service)).not.toContain('sessionLifecycle');
  });
});
