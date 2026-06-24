import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SessionEventType, SessionStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionCancellationPolicyRepository } from '../repositories/session-cancellation-policy.repository';
import { SessionRepository } from '../repositories/session.repository';
import { ApplySessionCancellationFinancialEffectsService } from '../services/apply-session-cancellation-financial-effects.service';
import { EvaluateSessionCancellationPolicyService } from '../services/evaluate-session-cancellation-policy.service';
import { ValidateSessionStatusTransitionService } from '../services/validate-session-status-transition.service';

/**
 * Patient cancellation is transition-guarded and policy-driven.
 * Financial side effects are evaluated from typed cancellation policy contracts.
 */
@Injectable()
export class CancelSessionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionCancellationPolicyRepository: SessionCancellationPolicyRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly validateSessionStatusTransitionService: ValidateSessionStatusTransitionService,
    private readonly evaluateSessionCancellationPolicyService: EvaluateSessionCancellationPolicyService,
    private readonly applySessionCancellationFinancialEffectsService: ApplySessionCancellationFinancialEffectsService,
    private readonly operationalNotificationService: OperationalNotificationService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    sessionId: string;
    reason?: string;
  }) {
    const patient = await this.sessionPatientRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.patientNotFound',
        error: 'SESSION_PATIENT_NOT_FOUND',
      });
    }

    const session = await this.sessionRepository.findById(input.sessionId);

    if (!session || session.patient.id !== patient.id) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    if (session.status === SessionStatus.CANCELLED) {
      throw new ConflictException({
        messageKey: 'sessions.errors.sessionAlreadyCancelled',
        error: 'SESSION_ALREADY_CANCELLED',
      });
    }

    this.validateSessionStatusTransitionService.assertCanTransition(
      session.status,
      SessionStatus.CANCELLED,
    );

    const evaluation =
      await this.evaluateSessionCancellationPolicyService.evaluate({
        session,
      });

    if (!evaluation.cancellationAllowed) {
      throw new ConflictException({
        messageKey: 'sessions.errors.cancellationNotAllowedByPolicy',
        error: 'SESSION_CANCELLATION_NOT_ALLOWED_BY_POLICY',
        messageParams: {
          ruleCode: evaluation.ruleCode,
          bookingType: evaluation.bookingType,
        },
      });
    }

    const cancelledAt = new Date();
    let refundIdToPost: string | null = null;

    const updatedSession = await this.prisma.$transaction(async (tx) => {
      const financialEffect =
        await this.applySessionCancellationFinancialEffectsService.apply({
          tx,
          session,
          evaluation,
          cancellationReason: input.reason ?? null,
        });

      refundIdToPost = financialEffect.generatedRefundId;

      const cancelledSession = await this.sessionRepository.updateStatus(
        session.id,
        {
          status: SessionStatus.CANCELLED,
          cancelledAt,
          cancelledByUserId: input.userId,
          cancellationReason: input.reason ?? null,
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: session.id,
          eventType: SessionEventType.CANCELLED_BY_PATIENT,
          actorUserId: input.userId,
          metadataJson: {
            reason: input.reason ?? null,
            cancellationPolicy: {
              bookingType: evaluation.bookingType,
              policyId: evaluation.policyId,
              policyVersion: evaluation.policyVersion,
              ruleId: evaluation.ruleId,
              ruleCode: evaluation.ruleCode,
              refundMode: evaluation.refundMode,
              refundPercent: evaluation.refundPercent,
              refundDestination: evaluation.refundDestination,
              hoursBeforeStart: Number(evaluation.hoursBeforeStart.toFixed(2)),
            },
            financialEffects: financialEffect.actions,
          } as Prisma.InputJsonValue,
        },
        tx,
      );

      await this.sessionCancellationPolicyRepository.createCancellationRecord(
        {
          sessionId: session.id,
          cancelledByUserId: input.userId,
          policyId: evaluation.policyId,
          policyRuleId: evaluation.ruleId,
          policyVersion: evaluation.policyVersion,
          bookingType: evaluation.bookingType,
          cancellationAllowed: evaluation.cancellationAllowed,
          refundMode: evaluation.refundMode,
          refundPercent: evaluation.refundPercent,
          refundAmount: financialEffect.refundAmount,
          refundDestination: evaluation.refundDestination,
          cancelledPaymentId: financialEffect.cancelledPaymentId,
          generatedRefundId: financialEffect.generatedRefundId,
          policySnapshotJson: {
            ruleCode: evaluation.ruleCode,
            ruleDisplayName: evaluation.ruleDisplayName,
            hoursBeforeStart: Number(evaluation.hoursBeforeStart.toFixed(2)),
            refundMode: evaluation.refundMode,
            refundPercent: evaluation.refundPercent,
            refundDestination: evaluation.refundDestination,
          } as Prisma.InputJsonValue,
          financialActionsSnapshotJson:
            financialEffect.actions as Prisma.InputJsonValue,
        },
        tx,
      );

      return cancelledSession;
    });

    await this.applySessionCancellationFinancialEffectsService.postRefundLedgerIfNeeded(
      refundIdToPost,
    );

    await this.operationalNotificationService.notifySessionCancelledByPatient({
      sessionId: updatedSession.id,
      patientProfileId: updatedSession.patient.id,
      practitionerProfileId: updatedSession.practitioner.id,
      scheduledStartAt: updatedSession.scheduledStartAt,
    });

    await this.operationalNotificationService.cancelSessionReminders({
      sessionId: updatedSession.id,
      cancelledAt,
    });

    return {
      item: this.sessionMapper.toDetails(updatedSession),
    };
  }
}
