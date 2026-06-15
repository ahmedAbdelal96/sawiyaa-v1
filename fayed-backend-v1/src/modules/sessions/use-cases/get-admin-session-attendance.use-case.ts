import { Injectable, NotFoundException } from '@nestjs/common';
import {
  SessionAttendanceEventType,
  SessionAttendanceParticipantRole,
} from '@prisma/client';
import { SessionRepository } from '../repositories/session.repository';
import {
  summarizeSessionAttendance,
} from '../utils/attendance-summary.engine';
import {
  buildParticipantsSummary,
  type SessionWithParticipants,
} from '../utils/session-participant-identity.util';
import {
  buildEvidenceTimeline,
  buildPlatformTimeline,
  type AttendanceInputItem,
  type EvidenceTimelineItem,
  type PlatformInputItem,
} from '../utils/evidence-timeline.util';
import { resolveSessionPresentationStatus } from '../utils/session-join-policy.util';
import type {
  AttendanceEvent,
  AttendanceSummaryInput,
  PlatformEvent,
  SessionAttendanceSummary,
  SessionTimingContext,
} from '../types/attendance-summary.types';

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
    // Phase 3 — fetch the session with the participant identity include so we
    // can surface patient/practitioner display names + primary contact
    // details. Reusing findById would expand the data surface for every
    // other consumer of the repository; `findByIdWithParticipants` is
    // explicit about the opt-in.
    const session = await this.sessionRepository.findByIdWithParticipants(
      input.sessionId,
    );

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    const events = await this.sessionRepository.listAttendanceEventsBySessionId(
      input.sessionId,
    );
    const platformEvents = await this.sessionRepository.listSessionEventsBySessionId(
      input.sessionId,
    );
    const summary = this.deriveSummary(events);

    // Build timing context from session
    const timing: SessionTimingContext = {
      scheduledStartAt: session.scheduledStartAt,
      scheduledEndAt: session.scheduledEndAt,
      durationMinutes: session.durationMinutes,
      // Phase 3 — these fields are not currently stored on the Session row;
      // the engine treats them as advisory nullable context.
      joinWindowOpenedAt: null,
      joinWindowClosedAt: null,
    };

    // Map to engine types
    const attendanceEvents: AttendanceEvent[] = events.map((e) => ({
      id: e.id,
      sessionId: e.sessionId,
      attendanceEventType: e.attendanceEventType,
      participantRole: e.participantRole,
      participantUserId: e.participantUserId,
      providerEventType: e.providerEventType,
      providerEventRef: e.providerEventRef,
      providerRoomRef: e.providerRoomRef,
      providerParticipantRef: e.providerParticipantRef,
      occurredAt: e.occurredAt,
      ingestedAt: e.ingestedAt,
    }));

    const platformEventsInput: PlatformEvent[] = platformEvents.map((e) => ({
      id: e.id,
      sessionId: e.sessionId,
      eventType: e.eventType,
      actorUserId: e.actorUserId,
      metadataJson: e.metadataJson as Record<string, unknown> | null,
      createdAt: e.createdAt,
    }));

    const engineInput: AttendanceSummaryInput = {
      timing,
      attendanceEvents,
      platformEvents: platformEventsInput,
      patientUserId: session.patientId,
      practitionerUserId: session.practitionerId,
      now: new Date(),
    };

    const extendedSummary: SessionAttendanceSummary = summarizeSessionAttendance(engineInput);

    // Phase 3 — build the new evidence surfaces.
    const sessionIdentityContext: {
      patientUserId: string | null;
      practitionerUserId: string | null;
    } = {
      patientUserId: session.patientId,
      practitionerUserId: session.practitionerId,
    };
    const resolveActorDisplayName = (userId: string | null) =>
      this.resolveDisplayName(session as unknown as SessionWithParticipants, userId);

    const platformInputRows: PlatformInputItem[] = platformEvents.map((e) => ({
      id: e.id,
      sessionId: e.sessionId,
      eventType: e.eventType,
      actorUserId: e.actorUserId,
      metadataJson: e.metadataJson as Record<string, unknown> | null,
      createdAt: e.createdAt,
    }));
    const attendanceInputRows: AttendanceInputItem[] = events.map((e) => ({
      id: e.id,
      sessionId: e.sessionId,
      attendanceEventType: e.attendanceEventType,
      participantRole: e.participantRole,
      participantUserId: e.participantUserId,
      provider: e.provider,
      providerEventType: e.providerEventType,
      providerEventRef: e.providerEventRef,
      providerRoomRef: e.providerRoomRef,
      providerParticipantRef: e.providerParticipantRef,
      occurredAt: e.occurredAt,
      ingestedAt: e.ingestedAt,
    }));

    const platformTimeline = buildPlatformTimeline({
      platformEvents: platformInputRows,
      session: sessionIdentityContext,
      resolveActorDisplayName,
    });
    const evidenceTimeline: EvidenceTimelineItem[] = buildEvidenceTimeline({
      attendanceEvents: attendanceInputRows,
      platformEvents: platformInputRows,
      session: sessionIdentityContext,
      resolveActorDisplayName,
    });

    const participants = buildParticipantsSummary(
      session as unknown as SessionWithParticipants,
    );

    const presentationStatus = resolveSessionPresentationStatus({
      status: session.status,
      sessionMode: session.sessionMode,
      scheduledStartAt: session.scheduledStartAt,
      scheduledEndAt: session.scheduledEndAt,
      provider: session.provider,
      providerRoomId: session.providerRoomId,
      providerSessionRef: session.providerSessionRef,
      now: new Date(),
    });

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
      platformTimeline,
      evidenceTimeline,
      participants,
      presentationStatus,
      extendedSummary: this.mapExtendedSummary(extendedSummary),
    };
  }

  private resolveDisplayName(
    session: SessionWithParticipants,
    userId: string | null,
  ): string | null {
    if (!userId) return null;
    if (session.patient?.user.id === userId) {
      return session.patient.user.displayName ?? null;
    }
    if (session.practitioner?.user.id === userId) {
      return session.practitioner.user.displayName ?? null;
    }
    return null;
  }

  private mapExtendedSummary(
    engine: SessionAttendanceSummary,
  ): SessionAttendanceSummary {
    return engine;
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
