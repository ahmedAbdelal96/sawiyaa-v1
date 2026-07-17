import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Payment,
  PatientPackagePurchaseStatus,
  SessionEventType,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { SessionLifecycleService } from '@modules/sessions/services/session-lifecycle.service';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';

@Injectable()
export class HandlePackagePurchasePaymentFailureUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly packagePurchaseRepository: PatientPackagePurchaseRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionLifecycleService: SessionLifecycleService,
  ) {}

  async execute(input: {
    paymentId: string;
    providerEventRef: string;
    payload: Record<string, unknown>;
    terminalOutcome: 'FAILED' | 'EXPIRED';
    payment?: Payment | null;
  }) {
    const payment =
      input.payment ?? (await this.paymentRepository.findById(input.paymentId));

    if (!payment) {
      throw new NotFoundException({
        messageKey: 'packagePurchases.errors.paymentNotFound',
        error: 'PACKAGE_PURCHASE_PAYMENT_NOT_FOUND',
      });
    }

    const purchase = await this.resolvePurchase(payment);

    if (!purchase) {
      throw new ConflictException({
        messageKey: 'packagePurchases.errors.notFound',
        error: 'PACKAGE_PURCHASE_NOT_FOUND',
      });
    }

    if (
      purchase.status === PatientPackagePurchaseStatus.ACTIVE ||
      purchase.status === PatientPackagePurchaseStatus.CANCELLED ||
      purchase.status === PatientPackagePurchaseStatus.EXPIRED ||
      purchase.status === PatientPackagePurchaseStatus.COMPLETED ||
      purchase.status === PatientPackagePurchaseStatus.REFUNDED
    ) {
      return {
        purchase,
      };
    }

    if (purchase.status !== PatientPackagePurchaseStatus.PENDING_PAYMENT) {
      return {
        purchase,
      };
    }

    if (!purchase.sessions.length) {
      throw new ConflictException({
        messageKey: 'packagePurchases.errors.noLinkedSessions',
        error: 'PACKAGE_PURCHASE_NO_LINKED_SESSIONS',
      });
    }

    const sessionsToExpire = purchase.sessions.filter(
      (session) => session.status === SessionStatus.PENDING_PAYMENT,
    );
    const unrepairableSessions = purchase.sessions.filter(
      (session) =>
        session.status !== SessionStatus.PENDING_PAYMENT &&
        session.status !== SessionStatus.EXPIRED,
    );

    if (unrepairableSessions.length > 0) {
      throw new ConflictException({
        messageKey: 'packagePurchases.errors.linkedSessionsNotPending',
        error: 'PACKAGE_PURCHASE_LINKED_SESSIONS_NOT_PENDING',
      });
    }

    const now = new Date();
    const shouldExpire =
      input.terminalOutcome === 'EXPIRED' ||
      !purchase.paymentExpiresAt ||
      purchase.paymentExpiresAt.getTime() <= now.getTime();
    const finalStatus = shouldExpire
      ? PatientPackagePurchaseStatus.EXPIRED
      : PatientPackagePurchaseStatus.CANCELLED;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedPurchase = await this.packagePurchaseRepository.updateStatus(
        purchase.id,
        finalStatus === PatientPackagePurchaseStatus.EXPIRED
          ? {
              status: PatientPackagePurchaseStatus.EXPIRED,
              expiredAt: now,
            }
          : {
              status: PatientPackagePurchaseStatus.CANCELLED,
              cancelledAt: now,
            },
        tx,
      );

      for (const [index, session] of sessionsToExpire.entries()) {
        await this.sessionLifecycleService.transition({
          session,
          to: SessionStatus.EXPIRED,
          at: now,
          metadata: {
            source: 'package-purchase-payment-failure',
            packagePurchaseId: purchase.id,
            packagePlanId: purchase.packagePlanId,
            packageSessionIndex: session.packageSessionIndex ?? index + 1,
            providerEventRef: input.providerEventRef,
            terminalOutcome: input.terminalOutcome,
            purchaseFinalStatus: finalStatus,
          },
          tx,
        });
      }

      return updatedPurchase;
    });

    return {
      purchase: updated,
    };
  }

  private async resolvePurchase(payment: Payment) {
    const purchaseByPayment =
      await this.packagePurchaseRepository.findByPaymentId(payment.id);

    if (purchaseByPayment) {
      return purchaseByPayment;
    }

    const metadata = (payment.metadataJson ?? {}) as Record<string, unknown>;
    const packagePurchaseId =
      typeof metadata.packagePurchaseId === 'string'
        ? metadata.packagePurchaseId.trim()
        : '';

    if (!packagePurchaseId) {
      return null;
    }

    return this.packagePurchaseRepository.findById(packagePurchaseId);
  }
}
