import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionEventType, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { ValidateSessionStatusTransitionService } from '../services/validate-session-status-transition.service';

/**
 * Unpaid expiration is a domain helper for later payment orchestration and scheduled jobs.
 * It is intentionally not exposed as a public controller endpoint in V1.
 */
@Injectable()
export class ExpireUnpaidSessionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly validateSessionStatusTransitionService: ValidateSessionStatusTransitionService,
  ) {}

  async execute(input: { sessionId: string }) {
    const session = await this.sessionRepository.findById(input.sessionId);

    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    if (session.status !== SessionStatus.PENDING_PAYMENT) {
      throw new ConflictException({
        messageKey: 'sessions.errors.sessionNotPendingPayment',
        error: 'SESSION_NOT_PENDING_PAYMENT',
      });
    }

    this.validateSessionStatusTransitionService.assertCanTransition(
      session.status,
      SessionStatus.EXPIRED,
    );

    const expiredAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const expiredSession = await this.sessionRepository.updateStatus(
        session.id,
        {
          status: SessionStatus.EXPIRED,
          expiredAt,
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId: session.id,
          eventType: SessionEventType.EXPIRED_UNPAID,
          metadataJson: {
            expiredAt: expiredAt.toISOString(),
          },
        },
        tx,
      );

      return expiredSession;
    });
  }
}
