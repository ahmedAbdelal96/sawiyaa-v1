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
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

@Injectable()
export class MarkSessionNoShowByPractitionerUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly sessionLifecycleService: SessionLifecycleService,
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

    if (session.status === SessionStatus.PATIENT_NO_SHOW) {
      throw new ConflictException({
        messageKey: 'sessions.errors.sessionAlreadyNoShow',
        error: 'SESSION_ALREADY_NO_SHOW',
      });
    }

    const updatedSession = await this.prisma.$transaction(async (tx) => {
      return this.sessionLifecycleService.transition({
        session,
        to: SessionStatus.PATIENT_NO_SHOW,
        actorUserId: input.userId,
        metadata: { markedBy: 'PRACTITIONER', locale: input.locale },
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
