import { Injectable, NotFoundException } from '@nestjs/common';
import {
  SessionAttendanceEventType,
  SessionAttendanceParticipantRole,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { summarizeSessionAttendance } from '../utils/attendance-summary.engine';
import {
  ATTENDANCE_SUMMARY_THRESHOLDS,
  resolveSessionFinalizationGraceMinutes,
} from '../config/attendance-summary.config';
import { SessionOutcomeEvaluator } from '../services/session-outcome-evaluator.service';
import { SessionOutcomePolicySnapshotService } from '../services/session-outcome-policy-snapshot.service';
import type { SessionOutcomeEvaluationPolicy } from '../types/session-outcome-evaluation.types';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionOutcomeEvaluator: SessionOutcomeEvaluator,
    private readonly policySnapshotService?: SessionOutcomePolicySnapshotService,
  ) {}

  async execute(input: {
    sessionId: string;
    tx?: Prisma.TransactionClient;
    evaluatedAt?: Date;
  }) {
    // Phase 3 — fetch the session with the participant identity include so we
    // can surface patient/practitioner display names + primary contact
    // details. Reusing findById would expand the data surface for every
    // other consumer of the repository; `findByIdWithParticipants` is
    // explicit about the opt-in.
    const session = await this.sessionRepository.findByIdWithParticipants(
      input.sessionId,
      input.tx,
    );

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    const events = await this.sessionRepository.listAttendanceEventsBySessionId(
      input.sessionId,
      input.tx,
    );
    const platformEvents =
      await this.sessionRepository.listSessionEventsBySessionId(
        input.sessionId,
        input.tx,
      );
    const summary = this.deriveSummary(events);
    const evaluatedAt = input.evaluatedAt ?? new Date();
    const policySnapshot =
      await this.sessionRepository.findOutcomePolicySnapshot?.(
        input.sessionId,
        input.tx,
      );
    const reconciliation =
      await this.sessionRepository.findLatestAttendanceReconciliation?.(
        input.sessionId,
        input.tx,
      );
    const trustedAttendanceEvents = events.filter((event) => {
      const metadata = event.ingestionMetaJson;
      return (
        metadata &&
        typeof metadata === 'object' &&
        (metadata as Record<string, unknown>).trustLevel === 'TRUSTED'
      );
    });
    const reconciliationConfirmed =
      reconciliation?.status === 'CONFIRMED' &&
      reconciliation.eligibleForAutomaticFinalization === true;
    const webhookPatientPresent =
      trustedAttendanceEventsCount(
        trustedAttendanceEvents,
        SessionAttendanceParticipantRole.PATIENT,
      ) > 0;
    const webhookPractitionerPresent =
      trustedAttendanceEventsCount(
        trustedAttendanceEvents,
        SessionAttendanceParticipantRole.PRACTITIONER,
      ) > 0;
    const patientPresent = reconciliationConfirmed
      ? reconciliation.patientJoined || webhookPatientPresent
      : webhookPatientPresent;
    const practitionerPresent = reconciliationConfirmed
      ? reconciliation.practitionerJoined || webhookPractitionerPresent
      : webhookPractitionerPresent;
    const reconciliationConflict =
      reconciliationConfirmed &&
      ((webhookPatientPresent && !reconciliation.patientJoined) ||
        (webhookPractitionerPresent && !reconciliation.practitionerJoined));

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
      ingestionMetaJson: e.ingestionMetaJson as Record<string, unknown> | null,
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
      now: evaluatedAt,
    };

    const extendedSummary: SessionAttendanceSummary =
      summarizeSessionAttendance(engineInput);
    const currentPolicy: SessionOutcomeEvaluationPolicy = {
      completionOverlapPercent:
        ATTENDANCE_SUMMARY_THRESHOLDS.MIN_OVERLAP_FOR_COMPLETION_PERCENT,
      minimumOverlapMinutes:
        ATTENDANCE_SUMMARY_THRESHOLDS.MIN_OVERLAP_FOR_COMPLETION_MINUTES,
      patientNoShowGraceMinutes:
        ATTENDANCE_SUMMARY_THRESHOLDS.PATIENT_NO_SHOW_AFTER_MINUTES,
      practitionerNoShowGraceMinutes:
        ATTENDANCE_SUMMARY_THRESHOLDS.PRACTITIONER_NO_SHOW_AFTER_MINUTES,
      finalizationGraceMinutes: resolveSessionFinalizationGraceMinutes(),
      lateEvidenceWaitingMinutes: 0,
    };
    const policy: SessionOutcomeEvaluationPolicy = policySnapshot
      ? (this.policySnapshotService?.toEvaluationPolicy(policySnapshot) ?? {
          completionOverlapPercent: policySnapshot.completionOverlapPercent,
          minimumOverlapMinutes: policySnapshot.minimumOverlapMinutes,
          patientNoShowGraceMinutes: policySnapshot.patientNoShowGraceMinutes,
          practitionerNoShowGraceMinutes:
            policySnapshot.practitionerNoShowGraceMinutes,
          finalizationGraceMinutes: policySnapshot.finalizationGraceMinutes,
          lateEvidenceWaitingMinutes: policySnapshot.lateEvidenceWaitingMinutes,
        })
      : currentPolicy;
    const hasEvidenceOutsideWindow = events.some((event) => {
      const metadata = event.ingestionMetaJson;
      const reason =
        metadata && typeof metadata === 'object'
          ? (metadata as Record<string, unknown>).rejectionOrWarningReason
          : null;
      return (
        reason === 'JOINED_BEFORE_RUNTIME_WINDOW' ||
        reason === 'JOINED_AFTER_RUNTIME_WINDOW'
      );
    });
    const evaluation = this.sessionOutcomeEvaluator.evaluate({
      session: {
        id: session.id,
        status: session.status,
        scheduledStartAt: session.scheduledStartAt,
        scheduledEndAt: session.scheduledEndAt,
        durationMinutes: session.durationMinutes,
        patientId: session.patientId,
        practitionerId: session.practitionerId,
        cancelledAt: session.cancelledAt,
      },
      attendance: {
        patientPresenceSeconds: extendedSummary.patient.totalPresenceSeconds,
        practitionerPresenceSeconds:
          extendedSummary.practitioner.totalPresenceSeconds,
        overlapSeconds: extendedSummary.overlap.overlapSeconds,
        patientTrustedJoinCount: patientPresent ? 1 : 0,
        practitionerTrustedJoinCount: practitionerPresent ? 1 : 0,
        unknownParticipantCount:
          extendedSummary.evidence.unknownParticipantEventCount,
        hasOpenIntervals:
          extendedSummary.evidence.hasOpenIntervalsWithoutCloseBoundary,
        hasMissingLeave: extendedSummary.evidence.hasMissingLeaveEvent,
        hasOutOfOrderEvidence: extendedSummary.evidence.hasOutOfOrderEvents,
        hasConflictingEvidence: reconciliationConflict,
        hasIdentityAmbiguity:
          extendedSummary.evidence.unknownParticipantEventCount > 0 ||
          events.some((event) => {
            const metadata = event.ingestionMetaJson;
            return (
              metadata &&
              typeof metadata === 'object' &&
              (metadata as Record<string, unknown>).roleResolutionBy ===
                'UNRESOLVED'
            );
          }),
        hasEvidenceOutsideWindow,
      },
      providerHealth: {
        webhookAuthenticated:
          trustedAttendanceEvents.length > 0 || reconciliationConfirmed,
        evidenceSourceTrusted:
          reconciliationConfirmed ||
          (trustedAttendanceEvents.length === events.length &&
            trustedAttendanceEvents.length > 0),
        meetingBoundsKnown:
          reconciliationConfirmed ||
          extendedSummary.meeting.sourceConfidence !== 'LOW',
        providerOutageKnown: false,
        roomCreationFailed:
          !session.providerRoomId && !reconciliation?.roomFound,
        reconciliationCompleted: reconciliationConfirmed,
        reconciliationHealthyForNoShow: reconciliationConfirmed,
        reconciliationConflict:
          reconciliation?.status === 'PARTIAL' ||
          (reconciliation?.unknownParticipantCount ?? 0) > 0,
      },
      policy,
      policySnapshotPresent: Boolean(policySnapshot),
      evaluatedAt,
    });

    // Phase 3 — build the new evidence surfaces.
    const sessionIdentityContext: {
      patientUserId: string | null;
      practitionerUserId: string | null;
    } = {
      patientUserId: session.patientId,
      practitionerUserId: session.practitionerId,
    };
    const resolveActorDisplayName = (userId: string | null) =>
      this.resolveDisplayName(
        session as unknown as SessionWithParticipants,
        userId,
      );

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

    const closedByUser = session.videoRoomClosedByUserId
      ? await (input.tx ?? this.prisma).user.findUnique({
          where: { id: session.videoRoomClosedByUserId },
          select: {
            id: true,
            displayName: true,
          },
        })
      : null;

    const relatedSupportTickets = await (
      input.tx ?? this.prisma
    ).supportTicket.findMany({
      where: {
        relatedSessionId: input.sessionId,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        ticketType: true,
        status: true,
        priority: true,
        subject: true,
        lastMessageAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const activeComplaintCount = relatedSupportTickets.filter((ticket) =>
      ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'ESCALATED'].includes(
        ticket.status,
      ),
    ).length;
    const db = input.tx ?? this.prisma;
    const openResolutionCase = db.sessionResolutionCase?.findUnique
      ? await db.sessionResolutionCase.findUnique({
          where: { sessionId: input.sessionId },
          select: { status: true },
        })
      : null;

    const presentationStatus = session.status;
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
      videoRoomClose: {
        closedAt: session.videoRoomClosedAt?.toISOString() ?? null,
        closedByUserId: session.videoRoomClosedByUserId ?? null,
        closedByDisplayName: closedByUser?.displayName ?? null,
        closeReason: session.videoRoomCloseReason ?? null,
        closeNote: session.videoRoomCloseNote ?? null,
      },
      relatedSupportTickets: relatedSupportTickets.map((ticket) => ({
        id: ticket.id,
        category: ticket.ticketType,
        status: ticket.status,
        priority: ticket.priority,
        subject: ticket.subject,
        lastMessageAt: ticket.lastMessageAt?.toISOString() ?? null,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      })),
      presentationStatus,
      extendedSummary: this.mapExtendedSummary(
        extendedSummary,
        evaluation,
        activeComplaintCount > 0,
        openResolutionCase?.status === 'OPEN',
      ),
      outcomeEvaluation: {
        ...evaluation,
        evaluatedAt: evaluation.evaluatedAt.toISOString(),
      },
      reconciliation: reconciliation
        ? {
            id: reconciliation.id,
            version: reconciliation.observationVersion,
            status: reconciliation.status,
            reconciledAt: reconciliation.reconciledAt.toISOString(),
            providerDataObservedUntil:
              reconciliation.providerDataObservedUntil?.toISOString() ?? null,
            provider: reconciliation.provider,
            roomFound: reconciliation.roomFound,
            meetingStarted: reconciliation.meetingStarted,
            meetingEnded: reconciliation.meetingEnded,
            patient: {
              identityConfirmed: reconciliation.patientIdentityConfirmed,
              joined: reconciliation.patientJoined,
              totalPresenceSeconds: reconciliation.patientTotalPresenceSeconds,
            },
            practitioner: {
              identityConfirmed: reconciliation.practitionerIdentityConfirmed,
              joined: reconciliation.practitionerJoined,
              totalPresenceSeconds:
                reconciliation.practitionerTotalPresenceSeconds,
            },
            unknownParticipantCount: reconciliation.unknownParticipantCount,
            confidence: reconciliation.confidence,
            reasonCodes: Array.isArray(reconciliation.reasonCodesJson)
              ? reconciliation.reasonCodesJson
              : [],
            evaluationStale: reconciliation.evaluationStale,
            staleReason: reconciliation.staleReason,
          }
        : null,
      policySnapshot: policySnapshot
        ? {
            version: policySnapshot.version,
            completionOverlapPercent: policySnapshot.completionOverlapPercent,
            minimumOverlapMinutes: policySnapshot.minimumOverlapMinutes,
            patientNoShowGraceMinutes: policySnapshot.patientNoShowGraceMinutes,
            practitionerNoShowGraceMinutes:
              policySnapshot.practitionerNoShowGraceMinutes,
            finalizationGraceMinutes: policySnapshot.finalizationGraceMinutes,
            lateEvidenceWaitingMinutes:
              policySnapshot.lateEvidenceWaitingMinutes,
            capturedAt: policySnapshot.capturedAt.toISOString(),
            source: policySnapshot.source,
          }
        : null,
      // Completion is now Admin-owned. Historical completion events remain in
      // the timeline but are never projected as an automatic finalization.
      finalization: null,
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
    evaluation: ReturnType<SessionOutcomeEvaluator['evaluate']>,
    hasActiveComplaint: boolean,
    hasOpenResolutionCase: boolean,
  ): SessionAttendanceSummary {
    const recommendedOutcome =
      evaluation.recommendedTerminalStatus === 'COMPLETED'
        ? 'COMPLETION_CANDIDATE'
        : evaluation.recommendedTerminalStatus === 'PATIENT_NO_SHOW'
          ? 'PATIENT_NO_SHOW_CANDIDATE'
          : evaluation.recommendedTerminalStatus === 'PRACTITIONER_NO_SHOW'
            ? 'PRACTITIONER_NO_SHOW_CANDIDATE'
            : evaluation.recommendedTerminalStatus === 'BOTH_NO_SHOW'
              ? 'BOTH_NO_SHOW_CANDIDATE'
              : evaluation.classification === 'NOT_READY_FOR_EVALUATION'
                ? 'INSUFFICIENT_EVIDENCE'
                : 'MANUAL_REVIEW_REQUIRED';

    const eligibleForAdminApproval =
      evaluation.eligibleForAdminApproval ??
      evaluation.eligibleForAutomaticFinalization ??
      false;
    const canApproveNormally =
      eligibleForAdminApproval &&
      (evaluation.classification === 'COMPLETION_CANDIDATE' ||
        evaluation.classification === 'AUTO_COMPLETABLE') &&
      evaluation.recommendedTerminalStatus === 'COMPLETED' &&
      !hasActiveComplaint &&
      !hasOpenResolutionCase;
    const reviewDecision = {
      canApproveNormally,
      requiresResolution: !canApproveNormally,
      reasonCode: hasOpenResolutionCase
        ? 'OPEN_RESOLUTION_CASE'
        : hasActiveComplaint
          ? 'ACTIVE_COMPLAINT'
          : evaluation.reasonCodes[0] ?? evaluation.classification,
      recommendation: recommendedOutcome,
    };

    return {
      ...engine,
      recommendation: {
        recommendedOutcome,
        recommendedReason: evaluation.reasonCodes.join(', '),
        riskFlags: evaluation.reasonCodes,
        isFinalDecision: false,
        requiresAdminReview: !eligibleForAdminApproval,
      },
      reviewDecision,
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

function trustedAttendanceEventsCount(
  trustedEvents: Array<{
    participantRole: SessionAttendanceParticipantRole;
    attendanceEventType: SessionAttendanceEventType;
  }>,
  role: SessionAttendanceParticipantRole,
): number {
  return trustedEvents.filter(
    (event) =>
      event.participantRole === role &&
      event.attendanceEventType === SessionAttendanceEventType.JOINED,
  ).length;
}
