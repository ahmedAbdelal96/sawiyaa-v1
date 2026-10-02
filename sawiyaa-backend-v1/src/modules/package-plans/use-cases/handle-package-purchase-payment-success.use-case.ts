import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Payment,
  PackageSchedulePolicy,
  PatientPackagePurchaseStatus,
  SessionEventType,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { PackageSettlementService } from '@modules/financial-operations/services/package-settlement.service';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { SessionSchedulePolicyService } from '@modules/config/services/session-schedule-policy.service';
import { SessionLifecycleService } from '@modules/sessions/services/session-lifecycle.service';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';

@Injectable()
export class HandlePackagePurchasePaymentSuccessUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly packagePurchaseRepository: PatientPackagePurchaseRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionLifecycleService: SessionLifecycleService,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly packageSettlementService: PackageSettlementService,
    private readonly sessionSchedulePolicyService: SessionSchedulePolicyService,
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

    const currentSchedulePolicy =
      await this.sessionSchedulePolicyService.resolve();
    const policyBySessionId = new Map<string, unknown>();

    // Payment capture is idempotent, but package activation is a separate
    // projection. Two webhook deliveries can therefore both reach this use
    // case after the payment row is already CAPTURED. Serialize on the
    // purchase and re-read all linked sessions inside the transaction so the
    // second delivery observes the first delivery's committed state instead
    // of replaying confirmation events.
    const activated = await this.prisma.$transaction(async (tx) => {
      if (typeof tx.$executeRaw === 'function') {
        await tx.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtext(${`package-purchase:${purchase.id}`})::bigint)
        `;
      }

      const currentPurchase = await this.packagePurchaseRepository.findById(
        purchase.id,
        tx,
      );
      if (!currentPurchase) {
        throw new ConflictException({
          messageKey: 'packagePurchases.errors.notFound',
          error: 'PACKAGE_PURCHASE_NOT_FOUND',
        });
      }

      if (
        currentPurchase.status === PatientPackagePurchaseStatus.CANCELLED ||
        currentPurchase.status === PatientPackagePurchaseStatus.EXPIRED ||
        currentPurchase.status === PatientPackagePurchaseStatus.COMPLETED ||
        currentPurchase.status === PatientPackagePurchaseStatus.REFUNDED
      ) {
        throw new ConflictException({
          messageKey: 'packagePurchases.errors.notPayable',
          error: 'PACKAGE_PURCHASE_NOT_PAYABLE',
        });
      }

      // ALLOW_SCHEDULE_LATER purchases intentionally have no linked Session
      // rows at capture time. Capture activates the entitlement; a later
      // booking atomically creates the canonical Session.
      if (
        !currentPurchase.sessions.length &&
        currentPurchase.schedulePolicySnapshot !==
          PackageSchedulePolicy.ALLOW_SCHEDULE_LATER
      ) {
        throw new ConflictException({
          messageKey: 'packagePurchases.errors.noLinkedSessions',
          error: 'PACKAGE_PURCHASE_NO_LINKED_SESSIONS',
        });
      }

      const pendingSessions = currentPurchase.sessions.filter(
        (session) => session.status === SessionStatus.PENDING_PAYMENT,
      );
      const unrepairableSessions = currentPurchase.sessions.filter(
        (session) =>
          session.status !== SessionStatus.PENDING_PAYMENT &&
          session.status !== SessionStatus.UPCOMING,
      );

      if (
        currentPurchase.status !== PatientPackagePurchaseStatus.ACTIVE &&
        unrepairableSessions.length > 0
      ) {
        throw new ConflictException({
          messageKey: 'packagePurchases.errors.linkedSessionsNotPending',
          error: 'PACKAGE_PURCHASE_LINKED_SESSIONS_NOT_PENDING',
        });
      }

      const shouldRepairPurchase =
        currentPurchase.status ===
          PatientPackagePurchaseStatus.PENDING_PAYMENT ||
        !currentPurchase.paidAt ||
        !currentPurchase.activatedAt ||
        pendingSessions.length > 0;

      if (
        currentPurchase.status === PatientPackagePurchaseStatus.ACTIVE &&
        !shouldRepairPurchase
      ) {
        await this.packageSettlementService.reconcilePurchase(
          currentPurchase,
          tx,
        );

        return {
          purchase: currentPurchase,
          notificationPurchase: currentPurchase,
          sessionsToNotify: [] as typeof pendingSessions,
        };
      }

      const now = new Date();
      const updatedPurchase = await this.packagePurchaseRepository.updateStatus(
        currentPurchase.id,
        {
          status: PatientPackagePurchaseStatus.ACTIVE,
          paidAt: currentPurchase.paidAt ?? now,
          activatedAt: currentPurchase.activatedAt ?? now,
        },
        tx,
      );

      for (const [index, session] of pendingSessions.entries()) {
        const schedulePolicy =
          this.sessionSchedulePolicyService.withScheduleRevision(
            currentSchedulePolicy,
            session.scheduleRevision,
          );
        policyBySessionId.set(session.id, schedulePolicy);
        const joinOpenAt = session.scheduledStartAt
          ? new Date(
              session.scheduledStartAt.getTime() -
                schedulePolicy.join.joinEarlyMinutes * 60_000,
            )
          : null;
        const joinCloseAt = session.scheduledEndAt
          ? new Date(
              session.scheduledEndAt.getTime() +
                schedulePolicy.join.joinAfterEndGraceMinutes * 60_000,
            )
          : null;

        await this.sessionLifecycleService.transition({
          session,
          to: SessionStatus.UPCOMING,
          data: {
            joinOpenAt,
            joinCloseAt,
            schedulePolicySnapshotJson:
              schedulePolicy as unknown as import('@prisma/client').Prisma.InputJsonValue,
          },
          metadata: {
            source: 'package-purchase-payment-success',
            packagePurchaseId: currentPurchase.id,
            providerEventRef: input.providerEventRef,
          },
          tx,
        });

        await this.sessionRepository.createEvent(
          {
            sessionId: session.id,
            eventType: SessionEventType.PAYMENT_CONFIRMED,
            metadataJson: {
              source: 'package-purchase-payment-success',
              packagePurchaseId: currentPurchase.id,
              packagePlanId: currentPurchase.packagePlanId,
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

      return {
        purchase: updatedPurchase,
        notificationPurchase: currentPurchase,
        sessionsToNotify: pendingSessions,
      };
    });

    await Promise.all(
      activated.sessionsToNotify.map((session, index) =>
        this.operationalNotificationService.notifySessionConfirmed({
          patientProfileId: activated.notificationPurchase.patientId,
          practitionerProfileId: activated.notificationPurchase.practitionerId,
          sessionId: session.id,
          scheduledStartAt: session.scheduledStartAt,
          scheduledEndAt: session.scheduledEndAt,
          scheduleRevision: session.scheduleRevision,
          schedulePolicySnapshot: policyBySessionId.get(session.id),
          packageContext: {
            packagePurchaseId: activated.purchase.id,
            packagePlanCode:
              activated.notificationPurchase.packagePlan?.code ?? '',
            packagePlanTitle:
              activated.notificationPurchase.packagePlan?.title ?? null,
            packageSessionIndex: session.packageSessionIndex ?? index + 1,
            packageSessionCount:
              session.packageSessionCount ??
              activated.notificationPurchase.sessionCountSnapshot,
            packageDiscountPercent:
              activated.notificationPurchase.packagePlan?.discountPercent ==
              null
                ? null
                : Number(
                    activated.notificationPurchase.packagePlan.discountPercent,
                  ),
          },
        }),
      ),
    );

    return {
      purchase: activated.purchase,
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
