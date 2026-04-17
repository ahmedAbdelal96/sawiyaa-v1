import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionEventType, SessionStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionRepository } from '../repositories/session.repository';
import { ValidateSessionStatusTransitionService } from '../services/validate-session-status-transition.service';

/**
 * Patient cancellation is kept explicit and transition-guarded.
 * Refund/payment side effects remain intentionally outside Sessions V1.
 */
@Injectable()
export class CancelSessionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly validateSessionStatusTransitionService: ValidateSessionStatusTransitionService,
    private readonly operationalNotificationService: OperationalNotificationService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    sessionId: string;
    reason?: string;
  }) {
    const patient = await this.sessionPatientRepository.findByUserId(input.userId);

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

    const cancelledAt = new Date();

    const updatedSession = await this.prisma.$transaction(async (tx) => {
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
          },
        },
        tx,
      );

      return cancelledSession;
    });

    await this.operationalNotificationService.notifySessionCancelledByPatient({
      sessionId: updatedSession.id,
      patientProfileId: updatedSession.patient.id,
      practitionerProfileId: updatedSession.practitioner.id,
      scheduledStartAt: updatedSession.scheduledStartAt,
    });

    return {
      item: this.sessionMapper.toDetails(updatedSession),
    };
  }
}
