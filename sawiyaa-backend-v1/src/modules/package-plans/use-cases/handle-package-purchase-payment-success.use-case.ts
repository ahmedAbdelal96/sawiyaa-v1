import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Payment,
  PaymentEventType,
  PatientPackagePurchaseStatus,
  SessionEventType,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { PackageSettlementService } from '@modules/financial-operations/services/package-settlement.service';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { SESSION_JOIN_LEAD_MINUTES } from '@modules/sessions/utils/session-join-policy.util';
import { ValidateSessionStatusTransitionService } from '@modules/sessions/services/validate-session-status-transition.service';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';

@Injectable()
export class HandlePackagePurchasePaymentSuccessUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly packagePurchaseRepository: PatientPackagePurchaseRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly validateSessionStatusTransitionService: ValidateSessionStatusTransitionService,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly packageSettlementService: PackageSettlementService,
  ) {}

  async execute(input: {
    paymentId: string;
    providerEventRef: string;
    payload: Record<string, unknown>;
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
      purchase.status === PatientPackagePurchaseStatus.CANCELLED ||
      purchase.status === PatientPackagePurchaseStatus.EXPIRED ||
      purchase.status === PatientPackagePurchaseStatus.COMPLETED ||
      purchase.status === PatientPackagePurchaseStatus.REFUNDED
    ) {
      throw new ConflictException({
        messageKey: 'packagePurchases.errors.notPayable',
        error: 'PACKAGE_PURCHASE_NOT_PAYABLE',
      });
    }

    if (!purchase.sessions.length) {
      throw new ConflictException({
        messageKey: 'packagePurchases.errors.noLinkedSessions',
        error: 'PACKAGE_PURCHASE_NO_LINKED_SESSIONS',
      });
    }

    const pendingSessions = purchase.sessions.filter(
      (session) => session.status === SessionStatus.PENDING_PAYMENT,
    );
    const unrepairableSessions = purchase.sessions.filter(
      (session) =>
        session.status !== SessionStatus.PENDING_PAYMENT &&
        session.status !== SessionStatus.CONFIRMED,
    );

    if (unrepairableSessions.length > 0) {
      throw new ConflictException({
        messageKey: 'packagePurchases.errors.linkedSessionsNotPending',
        error: 'PACKAGE_PURCHASE_LINKED_SESSIONS_NOT_PENDING',
      });
    }

    const shouldRepairPurchase =
      purchase.status === PatientPackagePurchaseStatus.PENDING_PAYMENT ||
      !purchase.paidAt ||
      !purchase.activatedAt ||
      pendingSessions.length > 0;

    if (
      purchase.status === PatientPackagePurchaseStatus.ACTIVE &&
      !shouldRepairPurchase
    ) {
      await this.packageSettlementService.reconcilePurchase(purchase);

      return {
        purchase,
      };
    }

    const now = new Date();

    const activated = await this.prisma.$transaction(async (tx) => {
      const updatedPurchase = await this.packagePurchaseRepository.updateStatus(
        purchase.id,
        {
          status: PatientPackagePurchaseStatus.ACTIVE,
          paidAt: purchase.paidAt ?? now,
          activatedAt: purchase.activatedAt ?? now,
        },
        tx,
      );

      for (const [index, session] of pendingSessions.entries()) {
        this.validateSessionStatusTransitionService.assertCanTransition(
          session.status,
          SessionStatus.CONFIRMED,
        );

        const joinOpenAt = session.scheduledStartAt
          ? new Date(
              session.scheduledStartAt.getTime() -
                SESSION_JOIN_LEAD_MINUTES * 60_000,
            )
          : null;

        await this.sessionRepository.updateStatus(
          session.id,
          {
            status: SessionStatus.CONFIRMED,
            joinOpenAt,
          },
          tx,
        );

        await this.sessionRepository.createEvent(
          {
            sessionId: session.id,
            eventType: SessionEventType.PAYMENT_CONFIRMED,
            metadataJson: {
              source: 'package-purchase-payment-success',
              packagePurchaseId: purchase.id,
              packagePlanId: purchase.packagePlanId,
              packageSessionIndex: session.packageSessionIndex ?? index + 1,
              providerEventRef: input.providerEventRef,
            },
          },
          tx,
        );

        await this.sessionRepository.createEvent(
          {
            sessionId: session.id,
            eventType: SessionEventType.SESSION_CONFIRMED,
            metadataJson: {
              source: 'package-purchase-payment-success',
              packagePurchaseId: purchase.id,
              packagePlanId: purchase.packagePlanId,
              packageSessionIndex: session.packageSessionIndex ?? index + 1,
              providerEventRef: input.providerEventRef,
            },
          },
          tx,
        );
      }

      await this.packageSettlementService.reconcilePurchase(
        updatedPurchase,
        tx,
      );

      return updatedPurchase;
    });

    await Promise.all(
      pendingSessions.map((session, index) =>
        this.operationalNotificationService.notifySessionConfirmed({
          patientProfileId: purchase.patientId,
          practitionerProfileId: purchase.practitionerId,
          sessionId: session.id,
          scheduledStartAt: session.scheduledStartAt,
          packageContext: {
            packagePurchaseId: purchase.id,
            packagePlanCode: purchase.packagePlan?.code ?? '',
            packagePlanTitle: purchase.packagePlan?.title ?? null,
            packageSessionIndex: session.packageSessionIndex ?? index + 1,
            packageSessionCount:
              session.packageSessionCount ?? purchase.sessions.length,
            packageDiscountPercent:
              purchase.packagePlan?.discountPercent == null
                ? null
                : Number(purchase.packagePlan.discountPercent),
          },
        }),
      ),
    );

    return {
      purchase: activated,
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
