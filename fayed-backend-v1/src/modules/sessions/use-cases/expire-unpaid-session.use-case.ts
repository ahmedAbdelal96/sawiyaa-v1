import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionEventType, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { ValidateSessionStatusTransitionService } from '../services/validate-session-status-transition.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

/**
 * Unpaid expiration is a domain helper for later payment orchestration and scheduled jobs.
 * It is intentionally not exposed as a public controller endpoint in V1.
 *
 * Lifecycle guarantees:
 * - Idempotent: running multiple times produces the same final state
 * - Session expiry cascades to open payment attempts (CREATED/PENDING/REQUIRES_ACTION/AUTHORIZED uncaptured)
 * - Wallet reservations are released atomically with the session expiry
 * - Audit trail preserved (payment rows remain with EXPIRED/CANCELLED status)
 */
@Injectable()
export class ExpireUnpaidSessionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly validateSessionStatusTransitionService: ValidateSessionStatusTransitionService,
    private readonly paymentRepository: PaymentRepository,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
    private readonly operationalNotificationService: OperationalNotificationService,
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

    const sessionId = session.id;

    this.validateSessionStatusTransitionService.assertCanTransition(
      session.status,
      SessionStatus.EXPIRED,
    );

    const expiredAt = new Date();

    const expiredSession = await this.prisma.$transaction(async (tx) => {
      // 1. Expire the session
      const expiredSession = await this.sessionRepository.updateStatus(
        sessionId,
        {
          status: SessionStatus.EXPIRED,
          expiredAt,
        },
        tx,
      );

      await this.sessionRepository.createEvent(
        {
          sessionId,
          eventType: SessionEventType.EXPIRED_UNPAID,
          metadataJson: {
            expiredAt: expiredAt.toISOString(),
          },
        },
        tx,
      );

      // 2. Finalize all open payment attempts for this session
      // Only touch payments that are still actionable (not yet finalized)
      const openPaymentStatuses = [
        'CREATED' as const,
        'PENDING' as const,
        'REQUIRES_ACTION' as const,
        'AUTHORIZED' as const,
      ];

      const openPayments = await tx.payment.findMany({
        where: {
          sessionId,
          status: { in: openPaymentStatuses },
        },
      });

      for (const payment of openPayments) {
        // For AUTHORIZED, we cancel rather than expire (authorized funds should be released, not expired)
        // For CREATED/PENDING/REQUIRES_ACTION, we expire them
        const targetStatus =
          payment.status === 'AUTHORIZED'
            ? 'CANCELLED' as const
            : 'EXPIRED' as const;

        await this.paymentRepository.updateStatus(payment.id, {
          status: targetStatus,
          expiredAt: targetStatus === 'EXPIRED' ? expiredAt : null,
        });

        await this.paymentRepository.createEvent(
          {
            paymentId: payment.id,
            eventType: 'PAYMENT_EXPIRED' as const,
            payloadJson: {
              reason: 'SESSION_EXPIRED',
              sessionId: session.id,
              expiredAt: expiredAt.toISOString(),
            },
          },
          tx,
        );

        // 3. Release wallet reservation if one exists
        // releaseReservationForPayment is already idempotent (checks RELEASED status before acting)
        if (payment.amountFromWallet.gt(0)) {
          await this.customerWalletAccountingService.releaseReservationForPayment(
            {
              paymentId: payment.id,
              currencyCode: payment.currencyCode,
              releaseReason: 'PAYMENT_EXPIRED',
              tx,
            },
          );
        }
      }

      return expiredSession;
    });

    await this.operationalNotificationService.cancelSessionReminders({
      sessionId,
      cancelledAt: expiredAt,
    });

    return expiredSession;
  }
}
