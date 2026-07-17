import {
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
import { PostPackageSessionLedgerEntriesUseCase } from '@modules/financial-operations/use-cases/post-package-session-ledger-entries.use-case';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

@Injectable()
export class MarkSessionCompletedByPractitionerUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionPractitionerRepository: SessionPractitionerRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionMapper: SessionMapper,
    private readonly sessionLifecycleService: SessionLifecycleService,
    private readonly postPackageSessionLedgerEntriesUseCase: PostPackageSessionLedgerEntriesUseCase,
    private readonly sessionEarningReviewService: SessionEarningReviewService,
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

    const completedAt = new Date();

    const updatedSession = await this.prisma.$transaction(async (tx) => {
      const completedSession = await this.sessionLifecycleService.transition({
        session,
        to: SessionStatus.COMPLETED,
        actorUserId: input.userId,
        at: completedAt,
        metadata: { markedBy: 'PRACTITIONER', locale: input.locale },
        tx,
      });

      await this.postPackageSessionLedgerEntriesUseCase.execute({
        sessionId: session.id,
        tx,
      });

      await this.sessionEarningReviewService.syncForSessionCompletion({
        sessionId: session.id,
        tx,
      });

      return completedSession;
    });

    await this.operationalNotificationService.cancelSessionReminders({
      sessionId: updatedSession.id,
      cancelledAt: completedAt,
    });

    return {
      item: this.sessionMapper.toDetails(updatedSession),
    };
  }
}
