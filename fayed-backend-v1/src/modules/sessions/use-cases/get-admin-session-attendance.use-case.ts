import { Injectable, NotFoundException } from '@nestjs/common';
import {
  SessionAttendanceEventType,
  SessionAttendanceParticipantRole,
} from '@prisma/client';
import { SessionRepository } from '../repositories/session.repository';

type AttendanceSummary = {
  patientHasJoined: boolean;
  practitionerHasJoined: boolean;
  patientJoinedAt: string | null;
  practitionerJoinedAt: string | null;
  patientLeftAt: string | null;
  practitionerLeftAt: string | null;
  firstJoinedAt: string | null;
  lastLeftAt: string | null;
};

@Injectable()
export class GetAdminSessionAttendanceUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(input: { sessionId: string }) {
    const session = await this.sessionRepository.findById(input.sessionId);

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    const events = await this.sessionRepository.listAttendanceEventsBySessionId(
      input.sessionId,
    );
    const summary = this.deriveSummary(events);

    return {
      sessionId: input.sessionId,
      summary,
      timeline: events.map((event) => ({
        id: event.id,
        sessionId: event.sessionId,
        attendanceEventType: event.attendanceEventType,
        participantRole: event.participantRole,
        participant: {
          userId: event.participantUserId,
        },
        provider: event.provider,
        providerEventType: event.providerEventType,
        providerEventRef: event.providerEventRef,
        providerRoomRef: event.providerRoomRef,
        providerParticipantRef: event.providerParticipantRef,
        occurredAt: event.occurredAt.toISOString(),
        ingestedAt: event.ingestedAt.toISOString(),
      })),
    };
  }

  private deriveSummary(
    events: Array<{
      attendanceEventType: SessionAttendanceEventType;
      participantRole: SessionAttendanceParticipantRole;
      occurredAt: Date;
    }>,
  ): AttendanceSummary {
    const patientJoins = this.pickRoleEvents(
      events,
      SessionAttendanceParticipantRole.PATIENT,
      SessionAttendanceEventType.JOINED,
    );
    const practitionerJoins = this.pickRoleEvents(
      events,
      SessionAttendanceParticipantRole.PRACTITIONER,
      SessionAttendanceEventType.JOINED,
    );
    const patientLeft = this.pickRoleEvents(
      events,
      SessionAttendanceParticipantRole.PATIENT,
      SessionAttendanceEventType.LEFT,
    );
    const practitionerLeft = this.pickRoleEvents(
      events,
      SessionAttendanceParticipantRole.PRACTITIONER,
      SessionAttendanceEventType.LEFT,
    );

    const allJoined = events
      .filter(
        (event) =>
          event.attendanceEventType === SessionAttendanceEventType.JOINED,
      )
      .map((event) => event.occurredAt.getTime())
      .sort((left, right) => left - right);

    const allLeft = events
      .filter(
        (event) =>
          event.attendanceEventType === SessionAttendanceEventType.LEFT,
      )
      .map((event) => event.occurredAt.getTime())
      .sort((left, right) => left - right);

    return {
      patientHasJoined: patientJoins.length > 0,
      practitionerHasJoined: practitionerJoins.length > 0,
      patientJoinedAt: this.pickFirstIso(patientJoins),
      practitionerJoinedAt: this.pickFirstIso(practitionerJoins),
      patientLeftAt: this.pickLastIso(patientLeft),
      practitionerLeftAt: this.pickLastIso(practitionerLeft),
      firstJoinedAt:
        allJoined.length > 0 ? new Date(allJoined[0]).toISOString() : null,
      lastLeftAt:
        allLeft.length > 0
          ? new Date(allLeft[allLeft.length - 1]).toISOString()
          : null,
    };
  }

  private pickRoleEvents(
    events: Array<{
      attendanceEventType: SessionAttendanceEventType;
      participantRole: SessionAttendanceParticipantRole;
      occurredAt: Date;
    }>,
    role: SessionAttendanceParticipantRole,
    eventType: SessionAttendanceEventType,
  ): Date[] {
    return events
      .filter(
        (event) =>
          event.participantRole === role &&
          event.attendanceEventType === eventType,
      )
      .map((event) => event.occurredAt)
      .sort((left, right) => left.getTime() - right.getTime());
  }

  private pickFirstIso(values: Date[]): string | null {
    if (!values.length) {
      return null;
    }

    return values[0].toISOString();
  }

  private pickLastIso(values: Date[]): string | null {
    if (!values.length) {
      return null;
    }

    return values[values.length - 1].toISOString();
  }
}
