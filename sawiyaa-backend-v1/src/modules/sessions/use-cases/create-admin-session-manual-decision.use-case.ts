import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  SessionAdminDecisionType,
  SessionEventType,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { sanitizeSafeMetadata } from '../utils/safe-metadata.util';
import { GetAdminSessionAttendanceUseCase } from './get-admin-session-attendance.use-case';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import type { AdminSessionManualDecisionItemDto } from '../dto/admin-session-manual-decision-response.dto';
import { SessionLifecycleService } from '../services/session-lifecycle.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';

const DECISION_TYPE_I18N_KEY: Record<SessionAdminDecisionType, string> = {
  [SessionAdminDecisionType.MARK_COMPLETED]: 'MARK_COMPLETED',
  [SessionAdminDecisionType.MARK_PATIENT_NO_SHOW]: 'MARK_PATIENT_NO_SHOW',
  [SessionAdminDecisionType.MARK_PRACTITIONER_NO_SHOW]: 'MARK_PRACTITIONER_NO_SHOW',
  [SessionAdminDecisionType.MARK_BOTH_NO_SHOW]: 'MARK_BOTH_NO_SHOW',
  [SessionAdminDecisionType.MARK_TECHNICAL_REVIEW]: 'MARK_TECHNICAL_REVIEW',
  [SessionAdminDecisionType.MARK_INSUFFICIENT_EVIDENCE]: 'MARK_INSUFFICIENT_EVIDENCE',
};

/** Statuses that make a session ineligible for manual decision */
const BLOCKING_STATUSES: SessionStatus[] = [
  SessionStatus.PENDING_PAYMENT,
  SessionStatus.CANCELLED,
  SessionStatus.EXPIRED,
  SessionStatus.COMPLETED,
  SessionStatus.PATIENT_NO_SHOW,
  SessionStatus.PRACTITIONER_NO_SHOW,
  SessionStatus.BOTH_NO_SHOW,
];

const NO_SHOW_DECISION_TYPES = new Set<SessionAdminDecisionType>([
  SessionAdminDecisionType.MARK_PATIENT_NO_SHOW,
  SessionAdminDecisionType.MARK_PRACTITIONER_NO_SHOW,
  SessionAdminDecisionType.MARK_BOTH_NO_SHOW,
]);

type DecisionWithUser = Prisma.SessionAdminDecisionGetPayload<{
  include: { adminUser: { select: { id: true; displayName: true } } };
}>;

@Injectable()
export class CreateAdminSessionManualDecisionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly getAdminSessionAttendanceUseCase: GetAdminSessionAttendanceUseCase,
    private readonly sessionEarningReviewService: SessionEarningReviewService,
    private readonly sessionLifecycleService: SessionLifecycleService,
  ) {}

  async execute(input: {
    sessionId: string;
    decisionType: SessionAdminDecisionType;
    decidedByUserId: string;
    reasonCode: string;
    adminNote?: string | null;
    confirmEvidenceReviewed: true;
    confirmNoAutomaticRefund: true;
    confirmNoAutomaticPayout: true;
    supersedePrevious?: boolean;
    actorRoles?: string[];
    requestId?: string | null;
    correlationId?: string | null;
  }): Promise<AdminSessionManualDecisionItemDto> {
    // Trusted evidence is read-only. Status eligibility is checked again under
    // the row lock below, immediately before the final decision is inserted.
    const attendanceData = await this.getAdminSessionAttendanceUseCase.execute({
      sessionId: input.sessionId,
    });
    const snapshot = this.buildEvidenceSnapshot(attendanceData);

    const decision = await this.prisma.$transaction(async (tx) => {
      const session = await this.sessionRepository.findByIdForUpdate(input.sessionId, tx);
      if (!session) {
        throw new NotFoundException({ messageKey: 'sessions.errors.sessionNotFound', error: 'SESSION_NOT_FOUND' });
      }
      if (([
        SessionStatus.COMPLETED,
        SessionStatus.CANCELLED,
        SessionStatus.EXPIRED,
        SessionStatus.PATIENT_NO_SHOW,
        SessionStatus.PRACTITIONER_NO_SHOW,
        SessionStatus.BOTH_NO_SHOW,
      ] as SessionStatus[]).includes(session.status)) {
        throw new ConflictException({
          messageKey: 'sessions.errors.finalOutcomeCorrectionNotSupported',
          error: 'SESSION_FINAL_OUTCOME_CORRECTION_NOT_SUPPORTED',
        });
      }
      await this.runEligibilityChecks(
        session,
        input.decisionType,
        input.supersedePrevious === true,
        tx,
      );
      const { previousSessionStatus, nextSessionStatus } = this.resolveStatusMapping(
        session.status,
        input.decisionType,
      );
      // 5a. If supersedePrevious=true, find and mark the latest active final decision
      let supersedesDecisionId: string | null = null;
      if (input.supersedePrevious) {
        const latestActive = await tx.sessionAdminDecision.findFirst({
          where: { sessionId: input.sessionId, isFinal: true },
          orderBy: { createdAt: 'desc' },
        });
        if (latestActive) {
          // Mark it non-final
          await tx.sessionAdminDecision.update({
            where: { id: latestActive.id },
            data: { isFinal: false },
          });
          supersedesDecisionId = latestActive.id;
        }
      }

      // 5b. Create the new decision
      const newDecision = await tx.sessionAdminDecision.create({
        data: {
          sessionId: input.sessionId,
          decisionType: input.decisionType,
          decidedByUserId: input.decidedByUserId,
          previousSessionStatus: previousSessionStatus,
          nextSessionStatus,
          reasonCode: input.reasonCode,
          adminNote: input.adminNote ?? null,
          recommendedOutcomeSnapshot: snapshot.recommendedOutcomeSnapshot,
          attendanceSummarySnapshot: snapshot.attendanceSummarySnapshot,
          evidenceTimelineSnapshot: snapshot.evidenceTimelineSnapshot,
          isFinal: true,
          supersedesDecisionId,
        },
      });

      // A final decision is audit history. Canonical status is updated through
      // the lifecycle service in the same transaction.
      if (nextSessionStatus != null) {
        let lifecycleSession = session;
        const needsConfirmationStep =
          nextSessionStatus !== SessionStatus.AWAITING_COMPLETION_CONFIRMATION &&
          ([
            SessionStatus.UPCOMING,
            SessionStatus.READY_TO_JOIN,
            SessionStatus.IN_PROGRESS,
          ] as SessionStatus[]).includes(session.status);

        if (needsConfirmationStep) {
          lifecycleSession = await this.sessionLifecycleService.transition({
            session: lifecycleSession,
            to: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
            actorUserId: input.decidedByUserId,
            actorType: SecurityAuditActorType.USER,
            actorRoles: input.actorRoles,
            source: SecurityAuditSource.HTTP_REQUEST,
            requestId: input.requestId,
            correlationId: input.correlationId,
            reason: input.reasonCode,
            at: newDecision.createdAt,
            metadata: { decisionId: newDecision.id, source: 'adminDecision' },
            tx,
          });
        }

        await this.sessionLifecycleService.transition({
          session: lifecycleSession,
          to: nextSessionStatus,
          actorUserId: input.decidedByUserId,
          actorType: SecurityAuditActorType.USER,
          actorRoles: input.actorRoles,
          source: SecurityAuditSource.HTTP_REQUEST,
          requestId: input.requestId,
          correlationId: input.correlationId,
          reason: input.reasonCode,
          at: newDecision.createdAt,
          metadata: { decisionId: newDecision.id, decisionType: input.decisionType },
          tx,
        });
      }

      if (nextSessionStatus === SessionStatus.COMPLETED) {
        await this.sessionEarningReviewService.syncForSessionCompletion({
          sessionId: input.sessionId,
          tx,
        });
      }

      // 5d. Write ADMIN_MANUAL_DECISION_CREATED audit event
      await tx.sessionEvent.create({
        data: {
          sessionId: input.sessionId,
          eventType: SessionEventType.ADMIN_MANUAL_DECISION_CREATED,
          actorUserId: input.decidedByUserId,
          actorType: SecurityAuditActorType.USER,
          actorRolesJson: input.actorRoles,
          source: SecurityAuditSource.HTTP_REQUEST,
          requestId: input.requestId,
          correlationId: input.correlationId,
          reason: input.reasonCode,
          previousStatus: previousSessionStatus,
          newStatus: nextSessionStatus,
          occurredAt: newDecision.createdAt,
          metadataJson: {
            decisionId: newDecision.id,
            decisionType: input.decisionType,
            decisionTypeLabelKey: DECISION_TYPE_I18N_KEY[input.decisionType],
            previousSessionStatus,
            nextSessionStatus,
            reasonCode: input.reasonCode,
            supersedesDecisionId,
          },
        },
      });

      // 5e. If superseding, write ADMIN_MANUAL_DECISION_SUPERSEDED audit event
      if (supersedesDecisionId) {
        await tx.sessionEvent.create({
          data: {
            sessionId: input.sessionId,
            eventType: SessionEventType.ADMIN_MANUAL_DECISION_SUPERSEDED,
            actorUserId: input.decidedByUserId,
            actorType: SecurityAuditActorType.USER,
            actorRolesJson: input.actorRoles,
            source: SecurityAuditSource.HTTP_REQUEST,
            requestId: input.requestId,
            correlationId: input.correlationId,
            reason: input.reasonCode,
            previousStatus: previousSessionStatus,
            newStatus: nextSessionStatus,
            occurredAt: newDecision.createdAt,
            metadataJson: {
              supersededDecisionId: supersedesDecisionId,
              newDecisionId: newDecision.id,
              newDecisionType: input.decisionType,
            },
          },
        });
      }

      return newDecision;
    });

    // 6. Fetch with admin user for response
    const decisionWithUser = await this.sessionRepository.findSessionAdminDecisionById(
      decision.id,
    );

    return this.toResponseDto(decisionWithUser!);
  }

  private async runEligibilityChecks(
    session: {
      id: string;
      status: SessionStatus;
      scheduledEndAt: Date | null;
    },
    decisionType: SessionAdminDecisionType,
    supersedePrevious?: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const now = new Date();

    // Must be past scheduled end
    if (!session.scheduledEndAt) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_DECISION_REQUIRES_PAST_END',
      });
    }
    if (now < session.scheduledEndAt) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_DECISION_REQUIRES_PAST_END',
      });
    }

    // Status must not be blocking
    if (BLOCKING_STATUSES.includes(session.status)) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_DECISION_NOT_ALLOWED_STATUS',
      });
    }

    if (NO_SHOW_DECISION_TYPES.has(decisionType)) {
      if (
        session.status === SessionStatus.PATIENT_NO_SHOW ||
        session.status === SessionStatus.PRACTITIONER_NO_SHOW ||
        session.status === SessionStatus.BOTH_NO_SHOW
      ) {
        throw new ConflictException({
          messageKey: 'sessions.errors.sessionAlreadyNoShow',
          error: 'SESSION_ALREADY_NO_SHOW',
        });
      }

      const latestActive = await this.sessionRepository.findLatestActiveSessionAdminDecision(
        session.id,
        tx,
      );
      if (
        latestActive &&
        NO_SHOW_DECISION_TYPES.has(latestActive.decisionType)
      ) {
        throw new ConflictException({
          messageKey: 'sessions.errors.sessionAlreadyNoShow',
          error: 'SESSION_ALREADY_NO_SHOW',
        });
      }
    }

    // If a final decision already exists and supersedePrevious is not true, reject
    if (!supersedePrevious) {
      const latestActive = await this.sessionRepository.findLatestActiveSessionAdminDecision(
        session.id,
        tx,
      );
      if (latestActive) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.sessionNotFound',
          error: 'SESSION_DECISION_ALREADY_FINAL',
        });
      }
    }
  }

  private buildEvidenceSnapshot(attendanceData: {
    extendedSummary: {
      recommendation: { recommendedOutcome: string; riskFlags: string[] };
      patient: {
        joinCount: number;
        reconnectCount: number;
        firstJoinedAt: Date | null;
        lastLeftAt: Date | null;
      };
      practitioner: {
        joinCount: number;
        reconnectCount: number;
        firstJoinedAt: Date | null;
        lastLeftAt: Date | null;
      };
      overlap: {
        overlapSeconds: number;
        overlapMinutes: number;
        hasMeaningfulOverlap: boolean;
      };
      meeting: {
        meetingStartedAt: Date | null;
        meetingEndedAt: Date | null;
        sourceConfidence: string;
      };
    };
    evidenceTimeline: Array<{
      id: string;
      kind: string;
      eventType: string;
      occurredAt: string;
      severity: string;
      titleKey: string;
      safeMetadataSummary: Record<string, string | number | boolean | null>;
    }>;
  }): {
    recommendedOutcomeSnapshot: Prisma.InputJsonValue;
    attendanceSummarySnapshot: Prisma.InputJsonValue;
    evidenceTimelineSnapshot: Prisma.InputJsonValue;
  } {
    const ext = attendanceData.extendedSummary;

    const recommendedOutcomeSnapshot = sanitizeSafeMetadata({
      recommendedOutcome: ext.recommendation?.recommendedOutcome ?? null,
      riskFlags: ext.recommendation?.riskFlags ?? [],
    });

    const attendanceSummarySnapshot = sanitizeSafeMetadata({
      patient: {
        hasJoined: (ext.patient?.joinCount ?? 0) > 0,
        joinCount: ext.patient?.joinCount ?? 0,
        reconnectCount: ext.patient?.reconnectCount ?? 0,
        firstJoinedAt: ext.patient?.firstJoinedAt ?? null,
        lastLeftAt: ext.patient?.lastLeftAt ?? null,
      },
      practitioner: {
        hasJoined: (ext.practitioner?.joinCount ?? 0) > 0,
        joinCount: ext.practitioner?.joinCount ?? 0,
        reconnectCount: ext.practitioner?.reconnectCount ?? 0,
        firstJoinedAt: ext.practitioner?.firstJoinedAt ?? null,
        lastLeftAt: ext.practitioner?.lastLeftAt ?? null,
      },
      overlap: {
        overlapSeconds: ext.overlap?.overlapSeconds ?? 0,
        overlapMinutes: ext.overlap?.overlapMinutes ?? 0,
        hasMeaningfulOverlap: ext.overlap?.hasMeaningfulOverlap ?? false,
      },
      meeting: {
        meetingStartedAt: ext.meeting?.meetingStartedAt ?? null,
        meetingEndedAt: ext.meeting?.meetingEndedAt ?? null,
        sourceConfidence: ext.meeting?.sourceConfidence ?? 'LOW',
      },
    });

    // evidenceTimeline items are already sanitized by the attendance use case;
    // apply one final sanitize pass to be safe.
    const evidenceTimelineSnapshot = sanitizeSafeMetadata(
      attendanceData.evidenceTimeline,
    );

    return {
      recommendedOutcomeSnapshot,
      attendanceSummarySnapshot,
      evidenceTimelineSnapshot,
    };
  }

  private resolveStatusMapping(
    currentStatus: SessionStatus,
    decisionType: SessionAdminDecisionType,
  ): { previousSessionStatus: SessionStatus; nextSessionStatus: SessionStatus | null } {
    switch (decisionType) {
      case SessionAdminDecisionType.MARK_COMPLETED:
        return {
          previousSessionStatus: currentStatus,
          nextSessionStatus: SessionStatus.COMPLETED,
        };
      case SessionAdminDecisionType.MARK_PATIENT_NO_SHOW:
        return {
          previousSessionStatus: currentStatus,
          nextSessionStatus: SessionStatus.PATIENT_NO_SHOW,
        };
      case SessionAdminDecisionType.MARK_PRACTITIONER_NO_SHOW:
        return {
          previousSessionStatus: currentStatus,
          nextSessionStatus: SessionStatus.PRACTITIONER_NO_SHOW,
        };
      case SessionAdminDecisionType.MARK_BOTH_NO_SHOW:
        return {
          previousSessionStatus: currentStatus,
          nextSessionStatus: SessionStatus.BOTH_NO_SHOW,
        };
      case SessionAdminDecisionType.MARK_TECHNICAL_REVIEW:
      case SessionAdminDecisionType.MARK_INSUFFICIENT_EVIDENCE:
        return {
          previousSessionStatus: currentStatus,
          nextSessionStatus: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        };
    }
  }

  private toResponseDto(decision: DecisionWithUser): AdminSessionManualDecisionItemDto {
    return {
      id: decision.id,
      sessionId: decision.sessionId,
      decisionType: decision.decisionType,
      previousSessionStatus: decision.previousSessionStatus,
      nextSessionStatus: decision.nextSessionStatus,
      isFinal: decision.isFinal,
      supersedesDecisionId: decision.supersedesDecisionId,
      reasonCode: decision.reasonCode,
      adminNote: decision.adminNote,
      decidedBy: {
        userId: decision.adminUser.id,
        displayName: decision.adminUser.displayName,
      },
      createdAt: decision.createdAt.toISOString(),
      recommendedOutcomeSnapshot: (decision.recommendedOutcomeSnapshot as Record<string, unknown>) ?? null,
      attendanceSummarySnapshot: (decision.attendanceSummarySnapshot as Record<string, unknown>) ?? null,
      evidenceTimelineSnapshot: (decision.evidenceTimelineSnapshot as Record<string, unknown>) ?? null,
    };
  }
}
