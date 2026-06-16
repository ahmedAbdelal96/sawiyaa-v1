import { Injectable, NotFoundException } from '@nestjs/common';
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
import type { AdminSessionManualDecisionItemDto } from '../dto/admin-session-manual-decision-response.dto';

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
  SessionStatus.REFUNDED,
  SessionStatus.REFUND_PENDING,
  SessionStatus.EXPIRED,
  SessionStatus.READY_TO_JOIN,
  SessionStatus.IN_PROGRESS,
];

type DecisionWithUser = Prisma.SessionAdminDecisionGetPayload<{
  include: { adminUser: { select: { id: true; displayName: true } } };
}>;

@Injectable()
export class CreateAdminSessionManualDecisionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly getAdminSessionAttendanceUseCase: GetAdminSessionAttendanceUseCase,
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
  }): Promise<AdminSessionManualDecisionItemDto> {
    // 1. Verify session exists
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    // 2. Eligibility checks
    await this.runEligibilityChecks(session, input.supersedePrevious);

    // 3. Build server-side evidence snapshot from trusted attendance data
    const attendanceData = await this.getAdminSessionAttendanceUseCase.execute({
      sessionId: input.sessionId,
    });
    const snapshot = this.buildEvidenceSnapshot(attendanceData);

    // 4. Determine status mapping
    const { previousSessionStatus, nextSessionStatus } = this.resolveStatusMapping(
      session.status,
      input.decisionType,
    );

    // 5. Run transactional logic
    const decision = await this.prisma.$transaction(async (tx) => {
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

      // 5c. Mutate Session.status if nextSessionStatus is defined
      if (nextSessionStatus != null) {
        await tx.session.update({
          where: { id: input.sessionId },
          data: { status: nextSessionStatus },
        });
      }

      // 5d. Write ADMIN_MANUAL_DECISION_CREATED audit event
      await tx.sessionEvent.create({
        data: {
          sessionId: input.sessionId,
          eventType: SessionEventType.ADMIN_MANUAL_DECISION_CREATED,
          actorUserId: input.decidedByUserId,
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
    session: { id: string; status: SessionStatus; scheduledEndAt: Date | null },
    supersedePrevious?: boolean,
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

    // If a final decision already exists and supersedePrevious is not true, reject
    if (!supersedePrevious) {
      const latestActive = await this.sessionRepository.findLatestActiveSessionAdminDecision(
        session.id,
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
          nextSessionStatus: SessionStatus.NO_SHOW,
        };
      case SessionAdminDecisionType.MARK_PRACTITIONER_NO_SHOW:
      case SessionAdminDecisionType.MARK_BOTH_NO_SHOW:
      case SessionAdminDecisionType.MARK_TECHNICAL_REVIEW:
      case SessionAdminDecisionType.MARK_INSUFFICIENT_EVIDENCE:
        return {
          previousSessionStatus: currentStatus,
          nextSessionStatus: null,
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
