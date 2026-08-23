import {
  SessionAttendanceEventType,
  SessionAttendanceParticipantRole,
  SessionStatus,
} from '@prisma/client';
import { ParticipantSessionOutcomeBoundaryService } from './participant-session-outcome-boundary.service';

describe('ParticipantSessionOutcomeBoundaryService', () => {
  const now = new Date('2026-04-02T10:20:00.000Z');
  const session = {
    id: 'session-1',
    status: SessionStatus.IN_PROGRESS,
    scheduledStartAt: new Date('2026-04-02T10:00:00.000Z'),
  };

  function build(input?: { events?: any[]; reconciliation?: any; grace?: number }) {
    const repository = {
      listAttendanceEventsBySessionId: jest.fn().mockResolvedValue(input?.events ?? []),
      findLatestAttendanceReconciliation: jest.fn().mockResolvedValue(input?.reconciliation ?? null),
    };
    const policy = {
      getForSession: jest.fn().mockResolvedValue({
        patientNoShowGraceMinutes: input?.grace ?? 15,
      }),
    };
    return new ParticipantSessionOutcomeBoundaryService(repository as never, policy as never);
  }

  const trustedJoin = (role: SessionAttendanceParticipantRole) => ({
    attendanceEventType: SessionAttendanceEventType.JOINED,
    participantRole: role,
    ingestionMetaJson: { trustLevel: 'TRUSTED' },
  });

  it('rejects patient no-show when trusted patient attendance exists', async () => {
    const result = await build({ events: [trustedJoin(SessionAttendanceParticipantRole.PATIENT)] })
      .decidePatientNoShow({ session, tx: {} as never, now });
    expect(result).toMatchObject({ kind: 'REJECT', error: 'SESSION_PATIENT_ATTENDANCE_CONFIRMED' });
  });

  it('does not treat JOIN_ALLOWED-style evidence as confirmed attendance', async () => {
    const result = await build({
      events: [{ attendanceEventType: SessionAttendanceEventType.JOINED, participantRole: SessionAttendanceParticipantRole.PATIENT, ingestionMetaJson: { trustLevel: 'UNTRUSTED' } }],
    }).decidePatientNoShow({ session, tx: {} as never, now });
    expect(result).toMatchObject({ kind: 'REQUIRES_ADMIN_RESOLUTION' });
  });

  it('rejects no-show before the patient grace boundary', async () => {
    const result = await build().decidePatientNoShow({
      session,
      tx: {} as never,
      now: new Date('2026-04-02T10:14:59.000Z'),
    });
    expect(result).toMatchObject({ kind: 'REJECT', error: 'SESSION_NO_SHOW_GRACE_NOT_ELAPSED' });
  });

  it('allows clear confirmed absence after grace', async () => {
    const result = await build({
      events: [trustedJoin(SessionAttendanceParticipantRole.PRACTITIONER)],
      reconciliation: {
        status: 'CONFIRMED', evaluationStale: false,
        patientIdentityConfirmed: true, patientJoined: false,
        practitionerIdentityConfirmed: true, practitionerJoined: true,
        unknownParticipantCount: 0,
      },
    }).decidePatientNoShow({ session, tx: {} as never, now });
    expect(result).toEqual({ kind: 'ALLOW' });
  });

  it('requires admin resolution for incomplete or conflicting evidence', async () => {
    const result = await build({ events: [trustedJoin(SessionAttendanceParticipantRole.PRACTITIONER)] })
      .decidePatientNoShow({ session, tx: {} as never, now });
    expect(result).toMatchObject({ kind: 'REQUIRES_ADMIN_RESOLUTION' });
  });

  it('makes technical room closure an unresolved outcome, never a no-show', () => {
    expect(build().decideRoomClosure({ status: SessionStatus.READY_TO_JOIN })).toMatchObject({
      kind: 'REQUIRES_ADMIN_RESOLUTION', reason: 'ROOM_CLOSED_OUTCOME_UNRESOLVED',
    });
  });
});
