import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SecurityAuditActorType, SessionResolutionPatientRemedy, SessionResolutionPractitionerRemedy, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { GetAdminSessionAttendanceUseCase } from './get-admin-session-attendance.use-case';
import { CompleteSessionTransactionService } from '../services/complete-session-transaction.service';
import { SessionLifecycleService } from '../services/session-lifecycle.service';

export type AutomaticCompletionResult =
  | 'COMPLETED'
  | 'ALREADY_COMPLETED'
  | 'SKIPPED_NOT_ELIGIBLE'
  | 'SKIPPED_STATUS'
  | 'SKIPPED_STALE';

/**
 * Completion-only finalizer. It never executes no-show recommendations.
 * Every decision is rebuilt from rows read after the session lock is held.
 */
@Injectable()
export class FinalizeSessionAutomaticallyAsCompletedUseCase {
  private readonly logger = new Logger(
    FinalizeSessionAutomaticallyAsCompletedUseCase.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionRepository,
    private readonly attendance: GetAdminSessionAttendanceUseCase,
    private readonly completion: CompleteSessionTransactionService,
    private readonly lifecycle: SessionLifecycleService,
  ) {}

  async execute(input: {
    sessionId: string;
    evaluatedAt?: Date;
    trigger?: string;
    workerRunId?: string;
  }): Promise<AutomaticCompletionResult> {
    const evaluatedAt = input.evaluatedAt ?? new Date();
    const workerRunId = input.workerRunId ?? 'manual-finalizer';

    return this.prisma.$transaction(async (tx) => {
      const session = await this.sessions.findByIdForUpdate(
        input.sessionId,
        tx,
      );
      if (!session) return 'SKIPPED_STATUS';
      if (session.status === SessionStatus.COMPLETED) {
        return 'ALREADY_COMPLETED';
      }
      if (session.status !== SessionStatus.AWAITING_COMPLETION_CONFIRMATION) {
        return 'SKIPPED_STATUS';
      }

      const attendance = await this.attendance.execute({
        sessionId: input.sessionId,
        tx,
        evaluatedAt,
      });
      const evaluation = attendance.outcomeEvaluation;
      const reconciliation = attendance.reconciliation;

      if (!attendance.policySnapshot || !reconciliation) {
        return 'SKIPPED_NOT_ELIGIBLE';
      }
      if (reconciliation?.evaluationStale) {
        return 'SKIPPED_STALE';
      }
      if (
        evaluation.classification !== 'AUTO_COMPLETABLE' ||
        evaluation.eligibleForAutomaticFinalization !== true ||
        evaluation.recommendedTerminalStatus !== 'COMPLETED'
      ) {
        if (
          evaluation.recommendedTerminalStatus &&
          evaluation.recommendedTerminalStatus !== 'COMPLETED' &&
          evaluation.classification === 'NEEDS_ADMIN_REVIEW'
        ) {
          const suggestedOutcome = evaluation.recommendedTerminalStatus as SessionStatus;
          const patientRemedy = suggestedOutcome === SessionStatus.PRACTITIONER_NO_SHOW
            ? (session.packagePurchaseId ? SessionResolutionPatientRemedy.RESTORE_PACKAGE : SessionResolutionPatientRemedy.CREDIT_WALLET)
            : suggestedOutcome === SessionStatus.PATIENT_NO_SHOW
              ? SessionResolutionPatientRemedy.KEEP_ORIGINAL
              : SessionResolutionPatientRemedy.KEEP_ORIGINAL;
          const practitionerRemedy = suggestedOutcome === SessionStatus.PATIENT_NO_SHOW
            ? SessionResolutionPractitionerRemedy.CREATE_EARNING_REVIEW
            : SessionResolutionPractitionerRemedy.NO_EARNING;
          await this.lifecycle.transition({
            session,
            to: SessionStatus.AWAITING_ADMIN_RESOLUTION,
            tx,
            reason: 'NO_SHOW_REQUIRES_ADMIN_RESOLUTION',
            metadata: { suggestedOutcome, reasonCodes: evaluation.reasonCodes },
          });
          await tx.sessionResolutionCase.upsert({
            where: { sessionId: session.id },
            create: {
              sessionId: session.id,
              suggestedOutcome,
              suggestedPatientRemedy: patientRemedy,
              suggestedPractitionerRemedy: practitionerRemedy,
              evidenceSnapshotJson: {
                evaluation,
                reconciliationId: reconciliation.id,
                reconciliationVersion: reconciliation.version,
              } as Prisma.InputJsonValue,
            },
            update: {
              suggestedOutcome,
              suggestedPatientRemedy: patientRemedy,
              suggestedPractitionerRemedy: practitionerRemedy,
              evidenceSnapshotJson: {
                evaluation,
                reconciliationId: reconciliation.id,
                reconciliationVersion: reconciliation.version,
              } as Prisma.InputJsonValue,
              version: { increment: 1 },
            },
          });
        }
        return 'SKIPPED_NOT_ELIGIBLE';
      }

      await this.completion.execute({
        session,
        tx,
        at: evaluatedAt,
        actorType: SecurityAuditActorType.SCHEDULED_JOB,
        source: 'AUTOMATIC_COMPLETION',
        reason: 'AUTO_COMPLETABLE',
        metadata: {
          completionMode: 'AUTOMATIC_COMPLETION',
          automaticDecisionType: 'AUTOMATIC_COMPLETION',
          idempotencyKey: `${session.id}:AUTOMATIC_COMPLETION:${attendance.policySnapshot.version}`,
          trigger: input.trigger ?? 'automatic-completion-worker',
          workerRunId,
          previousStatus: session.status,
          resultingStatus: SessionStatus.COMPLETED,
          finalizedAt: evaluatedAt.toISOString(),
          evaluatorClassification: evaluation.classification,
          policyVersion: attendance.policySnapshot.version,
          reconciliationId: reconciliation.id,
          reconciliationVersion: reconciliation.version,
          evaluatedAt: evaluatedAt.toISOString(),
          reasonCodes: evaluation.reasonCodes,
          thresholds: {
            completionOverlapPercent:
              attendance.policySnapshot.completionOverlapPercent,
            minimumOverlapMinutes:
              attendance.policySnapshot.minimumOverlapMinutes,
          },
          patientPresenceSeconds: reconciliation.patient.totalPresenceSeconds,
          practitionerPresenceSeconds:
            reconciliation.practitioner.totalPresenceSeconds,
          overlapSeconds:
            attendance.extendedSummary?.overlap.overlapSeconds ?? null,
          evidenceCutoff: reconciliation.providerDataObservedUntil,
          overlapPercentage: evaluation.evidenceSummary.overlapPercentage,
        } as Prisma.InputJsonObject,
      });

      this.logger.log(
        JSON.stringify({
          message: 'Session automatically completed',
          sessionId: input.sessionId,
          workerRunId,
          classification: evaluation.classification,
          policyVersion: attendance.policySnapshot.version,
          reconciliationVersion: reconciliation.version,
        }),
      );
      return 'COMPLETED';
    });
  }
}
