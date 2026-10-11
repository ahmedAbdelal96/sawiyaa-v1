import { Injectable } from '@nestjs/common';
import { Prisma, SessionProvider, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AppLoggerService } from '@common/logging/app-logger.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { resolveSessionFinalizationGraceMinutes } from '../config/attendance-summary.config';
import { SessionRepository } from '../repositories/session.repository';
import { GetAdminSessionAttendanceUseCase } from '../use-cases/get-admin-session-attendance.use-case';
import { ReconcileSessionAttendanceUseCase } from '../use-cases/reconcile-session-attendance.use-case';
import { CompleteSessionTransactionService } from './complete-session-transaction.service';
import { SessionLifecycleService } from './session-lifecycle.service';

export type AutomaticSessionCompletionTrigger =
  | 'PROVIDER_MEETING_ENDED'
  | 'RECOVERY_SWEEPER';

export type AutomaticSessionCompletionResult = {
  sessionId: string;
  outcome:
    | 'COMPLETED'
    | 'AWAITING_REVIEW'
    | 'WAITING_FOR_EVIDENCE'
    | 'ALREADY_COMPLETED'
    | 'TERMINAL_STATE_PROTECTED'
    | 'NOT_DUE'
    | 'SESSION_NOT_FOUND';
  reason?: string;
};

const TERMINAL_STATUSES = new Set<SessionStatus>([
  SessionStatus.COMPLETED,
  SessionStatus.CANCELLED,
  SessionStatus.PATIENT_NO_SHOW,
  SessionStatus.PRACTITIONER_NO_SHOW,
  SessionStatus.BOTH_NO_SHOW,
  SessionStatus.EXPIRED,
  SessionStatus.AWAITING_ADMIN_RESOLUTION,
]);

const EVALUATABLE_STATUSES = new Set<SessionStatus>([
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
  SessionStatus.IN_PROGRESS,
  SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
]);

/**
 * Evaluates trusted attendance before persisting a review state. A normal
 * candidate completes directly from IN_PROGRESS or AWAITING through the
 * canonical transaction boundary; AWAITING is only an uncertainty result.
 */
@Injectable()
export class AutomaticSessionCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly lifecycle: SessionLifecycleService,
    private readonly attendance: GetAdminSessionAttendanceUseCase,
    private readonly reconcile: ReconcileSessionAttendanceUseCase,
    private readonly completion: CompleteSessionTransactionService,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(input: {
    sessionId: string;
    at?: Date;
    trigger: AutomaticSessionCompletionTrigger;
  }): Promise<AutomaticSessionCompletionResult> {
    const at = input.at ?? new Date();
    await this.refreshProviderEvidence(input.sessionId);

    const result = await this.prisma.$transaction(async (tx) => {
      const current = await this.sessionRepository.findByIdForUpdate(
        input.sessionId,
        tx,
      );

      if (!current) {
        return {
          sessionId: input.sessionId,
          outcome: 'SESSION_NOT_FOUND' as const,
        };
      }
      if (current.status === SessionStatus.COMPLETED) {
        return {
          sessionId: input.sessionId,
          outcome: 'ALREADY_COMPLETED' as const,
        };
      }
      if (TERMINAL_STATUSES.has(current.status)) {
        return {
          sessionId: input.sessionId,
          outcome: 'TERMINAL_STATE_PROTECTED' as const,
          reason: current.status,
        };
      }
      if (!EVALUATABLE_STATUSES.has(current.status)) {
        return {
          sessionId: input.sessionId,
          outcome: 'TERMINAL_STATE_PROTECTED' as const,
          reason: 'CURRENT_STATUS_NOT_EVALUATABLE',
        };
      }

      const scheduledEndAt = current.scheduledEndAt;
      if (!scheduledEndAt || at.getTime() < scheduledEndAt.getTime()) {
        return {
          sessionId: input.sessionId,
          outcome: 'NOT_DUE' as const,
          reason: 'SESSION_NOT_ENDED',
        };
      }

      const evidence = await this.attendance.execute({
        sessionId: input.sessionId,
        tx,
        evaluatedAt: at,
        finalizationBoundaryAt: scheduledEndAt,
      });
      const decision = evidence.extendedSummary?.reviewDecision;
      const reason =
        decision?.reasonCode ??
        evidence.outcomeEvaluation?.reasonCodes?.[0] ??
        'MANUAL_REVIEW_REQUIRED';
      const activeStatusCanComplete =
        current.status === SessionStatus.IN_PROGRESS ||
        current.status === SessionStatus.AWAITING_COMPLETION_CONFIRMATION;
      const evidenceIsFresh = evidence.reconciliation?.evaluationStale !== true;

      if (
        decision?.canApproveNormally &&
        activeStatusCanComplete &&
        evidenceIsFresh
      ) {
        const completed = await this.completion.execute({
          session: current,
          tx,
          at,
          actorType: SecurityAuditActorType.SCHEDULED_JOB,
          source: SecurityAuditSource.SCHEDULED_JOB,
          reason: 'AUTOMATIC_COMPLETION_TRUSTED_ATTENDANCE',
          metadata: {
            trigger: input.trigger,
            evidenceReason: reason,
          } as Prisma.InputJsonObject,
        });

        return {
          sessionId: input.sessionId,
          outcome: 'COMPLETED' as const,
          reason,
          completed,
        };
      }

      const reviewDueAt =
        scheduledEndAt.getTime() +
        resolveSessionFinalizationGraceMinutes() * 60_000;
      const hasImmediateReviewBlocker =
        reason === 'ACTIVE_COMPLAINT' || reason === 'OPEN_RESOLUTION_CASE';
      const shouldPersistReview =
        current.status === SessionStatus.AWAITING_COMPLETION_CONFIRMATION ||
        at.getTime() >= reviewDueAt ||
        hasImmediateReviewBlocker;

      if (!shouldPersistReview) {
        return {
          sessionId: input.sessionId,
          outcome: 'WAITING_FOR_EVIDENCE' as const,
          reason:
            evidence.reconciliation?.evaluationStale === true
              ? 'STALE_ATTENDANCE_RECONCILIATION'
              : reason,
        };
      }

      if (current.status !== SessionStatus.AWAITING_COMPLETION_CONFIRMATION) {
        await this.lifecycle.transition({
          session: current,
          to: SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
          actorType: SecurityAuditActorType.SCHEDULED_JOB,
          source: SecurityAuditSource.SCHEDULED_JOB,
          reason: 'AUTOMATIC_COMPLETION_EVIDENCE_PENDING',
          at,
          metadata: {
            trigger: input.trigger,
            reviewEscalationAt: new Date(reviewDueAt).toISOString(),
            reason,
          },
          tx,
        });
      }

      return {
        sessionId: input.sessionId,
        outcome: 'AWAITING_REVIEW' as const,
        reason:
          evidence.reconciliation?.evaluationStale === true
            ? 'STALE_ATTENDANCE_RECONCILIATION'
            : decision?.canApproveNormally &&
                current.status !== SessionStatus.IN_PROGRESS
              ? 'ACTIVE_SESSION_NOT_IN_PROGRESS'
              : reason,
      };
    });

    if (result.outcome === 'COMPLETED') {
      this.logger.info(
        {
          message: 'Session completed automatically from trusted attendance',
          sessionId: result.sessionId,
          trigger: input.trigger,
        },
        undefined,
        'Sessions',
      );
    } else if (
      result.outcome === 'AWAITING_REVIEW' ||
      result.outcome === 'TERMINAL_STATE_PROTECTED'
    ) {
      this.logger.info(
        {
          message: 'Automatic session completion left outcome for review',
          sessionId: result.sessionId,
          trigger: input.trigger,
          outcome: result.outcome,
          reason: result.reason,
        },
        undefined,
        'Sessions',
      );
    }

    return result;
  }

  private async refreshProviderEvidence(sessionId: string): Promise<void> {
    const state =
      await this.sessionRepository.findAttendanceReconciliationState(sessionId);
    if (
      !state ||
      state.provider !== SessionProvider.DAILY ||
      !EVALUATABLE_STATUSES.has(state.status)
    ) {
      return;
    }

    try {
      await this.reconcile.execute({ sessionId });
    } catch (error) {
      this.logger.warn(
        {
          message: 'Automatic session completion evidence refresh failed',
          sessionId,
          error: error instanceof Error ? error : new Error(String(error)),
        },
        'Sessions',
      );
    }
  }
}
