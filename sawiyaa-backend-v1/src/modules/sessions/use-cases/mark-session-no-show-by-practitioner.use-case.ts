import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SessionLifecycleService } from '../services/session-lifecycle.service';
import { ParticipantSessionOutcomeBoundaryService } from '../services/participant-session-outcome-boundary.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

@Injectable()
export class MarkSessionNoShowByPractitionerUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly sessionLifecycleService: SessionLifecycleService,
    private readonly outcomeBoundary: ParticipantSessionOutcomeBoundaryService,
    private readonly operationalNotificationService: OperationalNotificationService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    sessionId: string;
  }) {
    const practitioner = await this.sessionPractitionerRepository.findByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.practitionerNotFound',
        error: 'SESSION_PRACTITIONER_NOT_FOUND',
      });
    }

    const session = await this.sessionRepository.findById(input.sessionId);

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    if (session.practitioner.id !== practitioner.id) {
      throw new ForbiddenException({
        messageKey: 'sessions.errors.sessionAccessDenied',
        error: 'SESSION_ACCESS_DENIED',
      });
    }

    const updatedSession = await this.prisma.$transaction(async (tx) => {
      const lockedSession = await this.sessionRepository.findByIdForUpdate(
        session.id,
        tx,
      );
      if (!lockedSession) {
        throw new NotFoundException({
          messageKey: 'sessions.errors.sessionNotFound',
          error: 'SESSION_NOT_FOUND',
        });
      }

      const decision = await this.outcomeBoundary.decidePatientNoShow({
        session: lockedSession,
        tx,
        now: new Date(),
      });
      if (decision.kind === 'REJECT') {
        throw new ConflictException({
          messageKey: decision.messageKey,
          error: decision.error,
        });
      }

      if (decision.kind === 'REQUIRES_ADMIN_RESOLUTION') {
        if (lockedSession.status === SessionStatus.AWAITING_ADMIN_RESOLUTION) {
          return lockedSession;
        }
        return this.sessionLifecycleService.transition({
          session: lockedSession,
          to: SessionStatus.AWAITING_ADMIN_RESOLUTION,
          actorUserId: input.userId,
          metadata: {
            requestedOutcome: SessionStatus.PATIENT_NO_SHOW,
            decision: 'REQUIRES_ADMIN_RESOLUTION',
            reason: decision.reason,
          },
          tx,
        });
      }

      return this.sessionLifecycleService.transition({
        session: lockedSession,
        to: SessionStatus.PATIENT_NO_SHOW,
        actorUserId: input.userId,
        metadata: {
          markedBy: 'PRACTITIONER',
          locale: input.locale,
          outcomeDecision: 'ALLOW',
        },
        tx,
      });
    });

    await this.operationalNotificationService.cancelSessionReminders({
      sessionId: updatedSession.id,
      cancelledAt: new Date(),
    });

    return {
      item: this.sessionMapper.toDetails(updatedSession),
    };

  }
}
