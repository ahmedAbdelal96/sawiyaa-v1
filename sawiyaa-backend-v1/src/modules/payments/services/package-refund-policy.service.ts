import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentEventType,
  PaymentStatus,
  Prisma,
  RefundDestination,
  RefundEventType,
  RefundStatus,
  RefundType,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import {
  PACKAGE_RESERVED_SESSION_STATUSES,
  PackageEntitlementService,
} from '@modules/package-plans/services/package-entitlement.service';
import { PatientPackagePurchaseRepository } from '@modules/package-plans/repositories/package-purchase.repository';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PostRefundLedgerEntriesUseCase } from '@modules/financial-operations/use-cases/post-refund-ledger-entries.use-case';
import { SessionLifecycleService } from '@modules/sessions/services/session-lifecycle.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { ValidatePaymentStatusTransitionService } from './validate-payment-status-transition.service';

type PackageRefundPreview = {
  packagePurchaseId: string;
  patient: { id: string; displayName: string | null };
  practitioner: { id: string; displayName: string | null };
  packageName: string;
  currency: string;
  packageNetPaid: string;
  totalSessions: number;
  usedSessions: number;
  unusedSessions: number;
  reservedSessions: number;
  standalonePriceSnapshot: string | null;
  standaloneSnapshots: string[];
  usedStandaloneValue: string | null;
  suggestedRefundAmount: string | null;
  priorRefundedAmount: string;
  maxFinalRefundAmount: string;
  futureSessionsAffected: number;
  futureSessionIds: string[];
  packageStatus: string;
  manualReviewRequired: boolean;
  manualReviewReason: string | null;
};

@Injectable()
export class PackageRefundPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly purchaseRepository: PatientPackagePurchaseRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly entitlementService: PackageEntitlementService,
    private readonly walletAccounting: CustomerWalletAccountingService,
    private readonly postRefundLedgerEntries: PostRefundLedgerEntriesUseCase,
    private readonly sessionLifecycle: SessionLifecycleService,
    private readonly paymentTransitions: ValidatePaymentStatusTransitionService,
  ) {}

  async previewByPaymentId(paymentId: string): Promise<PackageRefundPreview> {
    const purchase = await this.purchaseRepository.findByPaymentId(paymentId);
    if (!purchase) {
      throw new NotFoundException({ error: 'PACKAGE_PURCHASE_NOT_FOUND' });
    }
    return this.buildPreview(purchase);
  }

  async previewByPurchaseId(purchaseId: string): Promise<PackageRefundPreview> {
    const purchase = await this.purchaseRepository.findById(purchaseId);
    if (!purchase) {
      throw new NotFoundException({ error: 'PACKAGE_PURCHASE_NOT_FOUND' });
    }
    return this.buildPreview(purchase);
  }

  async finalize(input: {
    purchaseId: string;
    actorUserId: string;
    finalAmount?: string | number | null;
    reason: string;
    evidenceReference?: string | null;
    idempotencyKey?: string | null;
  }) {
    const idempotencyKey =
      input.idempotencyKey?.trim() || `package-refund:${input.purchaseId}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Booking and refund both acquire this lock first.  This makes the
      // last-entitlement decision deterministic across app instances.
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${`package-purchase:${input.purchaseId}`})::bigint)
      `;

      const byIdempotency = await tx.refund.findUnique({
        where: { idempotencyKey },
        include: { session: { select: { sessionCode: true } } },
      });
      if (byIdempotency) return { refund: byIdempotency, alreadyFinalized: true };

      const purchase = await this.purchaseRepository.findById(
        input.purchaseId,
        tx,
      );
      if (!purchase) {
        throw new NotFoundException({ error: 'PACKAGE_PURCHASE_NOT_FOUND' });
      }
      if (!purchase.paymentId || !purchase.payment) {
        throw new BadRequestException({ error: 'PACKAGE_PAYMENT_REQUIRED' });
      }

      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${purchase.paymentId})::bigint)
      `;
      const payment = await this.paymentRepository.findById(
        purchase.paymentId,
        tx,
      );
      if (!payment) throw new NotFoundException({ error: 'PAYMENT_NOT_FOUND' });
      if (
        payment.status !== PaymentStatus.CAPTURED &&
        payment.status !== PaymentStatus.PARTIALLY_REFUNDED &&
        payment.status !== PaymentStatus.REFUNDED
      ) {
        throw new BadRequestException({ error: 'PACKAGE_PAYMENT_NOT_REFUNDABLE' });
      }

      const preview = await this.buildPreview(purchase, tx);
      const existingPurchaseAudit = ((purchase.metadataJson ?? {}) as Record<string, unknown>).packageRefund as Record<string, unknown> | undefined;
      const existingPackageRefunds = await tx.refund.findMany({
        where: { paymentId: payment.id },
        include: { session: { select: { sessionCode: true } } },
        orderBy: { createdAt: 'desc' },
      });
      const packageRefund = existingPackageRefunds.find((refund) => {
        const metadata = (refund.metadataJson ?? {}) as Record<string, unknown>;
        return metadata.packagePurchaseId === purchase.id;
      });
      if (packageRefund) {
        return { refund: packageRefund, alreadyFinalized: true };
      }
      if (purchase.status === 'REFUNDED') {
        if (existingPurchaseAudit?.packageRefundPolicy === true) {
          return { refund: null, alreadyFinalized: true };
        }
        throw new ConflictException({ error: 'PACKAGE_ALREADY_REFUNDED' });
      }

      const amountText =
        input.finalAmount == null
          ? preview.suggestedRefundAmount
          : String(input.finalAmount);
      if (amountText == null) {
        throw new BadRequestException({
          error: 'PACKAGE_REFUND_MANUAL_REVIEW_AMOUNT_REQUIRED',
        });
      }
      let finalAmount: Prisma.Decimal;
      try {
        finalAmount = new Prisma.Decimal(amountText).toDecimalPlaces(2);
      } catch {
        throw new BadRequestException({ error: 'PACKAGE_REFUND_AMOUNT_INVALID' });
      }
      if (!finalAmount.isFinite() || finalAmount.lt(0)) {
        throw new BadRequestException({ error: 'PACKAGE_REFUND_AMOUNT_INVALID' });
      }
      const maxFinal = new Prisma.Decimal(preview.maxFinalRefundAmount);
      if (finalAmount.gt(maxFinal)) {
        throw new BadRequestException({
          error: 'PACKAGE_REFUND_AMOUNT_EXCEEDS_REMAINING',
        });
      }
      const reason = input.reason?.trim();
      if (!reason) {
        throw new BadRequestException({ error: 'PACKAGE_REFUND_REASON_REQUIRED' });
      }
      const evidenceReference = input.evidenceReference?.trim() || null;
      if (preview.manualReviewRequired && !evidenceReference) {
        throw new BadRequestException({ error: 'PACKAGE_REFUND_EVIDENCE_REQUIRED' });
      }
      if (
        preview.suggestedRefundAmount != null &&
        !finalAmount.equals(new Prisma.Decimal(preview.suggestedRefundAmount)) &&
        reason.length < 3
      ) {
        throw new BadRequestException({ error: 'PACKAGE_REFUND_OVERRIDE_REASON_REQUIRED' });
      }

      const now = new Date();
      const audit = {
        packageRefundPolicy: true,
        packagePurchaseId: purchase.id,
        suggestedRefundAmount: preview.suggestedRefundAmount,
        finalApprovedAmount: finalAmount.toFixed(2),
        packageNetPaid: preview.packageNetPaid,
        usedSessions: preview.usedSessions,
        unusedSessions: preview.unusedSessions,
        standalonePriceSnapshot: preview.standalonePriceSnapshot,
        usedStandaloneValue: preview.usedStandaloneValue,
        priorRefundedAmount: preview.priorRefundedAmount,
        maxFinalRefundAmount: preview.maxFinalRefundAmount,
        manualReviewRequired: preview.manualReviewRequired,
        operatorUserId: input.actorUserId,
        operatorAt: now.toISOString(),
        reason,
        evidenceReference,
        idempotencyKey,
      };

      // A zero-value policy outcome is still a valid package exit, but the
      // database deliberately forbids zero-amount Refund rows. Persist the
      // complete operator/audit decision on the purchase and settlement while
      // leaving payment, wallet and journal balances unchanged.
      if (finalAmount.isZero()) {
        const now = new Date();
        for (const session of purchase.sessions) {
          if (!PACKAGE_RESERVED_SESSION_STATUSES.has(session.status)) continue;
          await this.sessionLifecycle.transitionIfCurrentStatus({
            sessionId: session.id,
            expectedStatuses: [session.status],
            to: SessionStatus.CANCELLED,
            tx,
            actorUserId: input.actorUserId,
            actorType: SecurityAuditActorType.USER,
            actorRoles: ['ADMIN'],
            source: SecurityAuditSource.HTTP_REQUEST,
            reason: 'PACKAGE_REFUNDED_ZERO_VALUE',
            metadata: { packagePurchaseId: purchase.id, packageRefundPolicy: true },
          });
        }
        await this.purchaseRepository.updateStatus(
          purchase.id,
          {
            status: 'REFUNDED',
            refundedAt: now,
            metadataJson: { ...((purchase.metadataJson ?? {}) as Record<string, unknown>), packageRefund: audit } as Prisma.InputJsonValue,
          },
          tx,
        );
        const settlement = await tx.packageSettlement.findUnique({ where: { purchaseId: purchase.id } });
        if (settlement) {
          await tx.packageSettlement.update({
            where: { purchaseId: purchase.id },
            data: {
              status: 'REFUNDED_OR_ADJUSTED',
              reviewedAt: now,
              reviewedByAdminId: input.actorUserId,
              releasablePractitionerAmount: new Prisma.Decimal(0),
              decision: 'PACKAGE_REFUND_ZERO_VALUE',
              notes: reason.slice(0, 1000),
              metadataJson: { ...((settlement.metadataJson ?? {}) as Record<string, unknown>), packageRefund: audit } as Prisma.InputJsonValue,
            },
          });
        }
        return { refund: null, alreadyFinalized: false };
      }
      const refundType = finalAmount.equals(payment.amountTotal) && new Prisma.Decimal(preview.priorRefundedAmount).isZero()
        ? RefundType.FULL
        : RefundType.PARTIAL;
      const refund = await this.paymentRepository.createRefund(
        {
          paymentId: payment.id,
          sessionId: null,
          refundType,
          status: RefundStatus.REQUESTED,
          destination: RefundDestination.CUSTOMER_WALLET,
          refundReason: reason,
          amount: finalAmount.toFixed(2),
          currencyCode: payment.currencyCode,
          actorType: SecurityAuditActorType.USER,
          actorUserId: input.actorUserId,
          source: SecurityAuditSource.HTTP_REQUEST,
          idempotencyKey,
          metadataJson: audit as Prisma.InputJsonValue,
        },
        tx,
      );
      await this.paymentRepository.createRefundEvent(
        {
          refundId: refund.id,
          paymentId: payment.id,
          sessionId: null,
          eventType: RefundEventType.REQUESTED,
          previousStatus: null,
          newStatus: RefundStatus.REQUESTED,
          destination: refund.destination,
          amount: refund.amount,
          currencyCode: refund.currencyCode,
          actorType: SecurityAuditActorType.USER,
          actorUserId: input.actorUserId,
          source: SecurityAuditSource.HTTP_REQUEST,
          reason,
          idempotencyKey,
          metadataJson: audit as Prisma.InputJsonValue,
        },
        tx,
      );
      const succeeded = await this.paymentRepository.updateRefund(
        refund.id,
        { status: RefundStatus.SUCCEEDED, processedAt: now },
        tx,
      );
      await this.paymentRepository.createRefundEvent(
        {
          refundId: refund.id,
          paymentId: payment.id,
          sessionId: null,
          eventType: RefundEventType.WALLET_POSTED,
          previousStatus: RefundStatus.REQUESTED,
          newStatus: RefundStatus.SUCCEEDED,
          destination: succeeded.destination,
          amount: succeeded.amount,
          currencyCode: succeeded.currencyCode,
          actorType: SecurityAuditActorType.USER,
          actorUserId: input.actorUserId,
          source: SecurityAuditSource.HTTP_REQUEST,
          reason,
          idempotencyKey,
        },
        tx,
      );
      await this.paymentRepository.createEvent(
        {
          paymentId: payment.id,
          eventType: PaymentEventType.REFUND_REQUESTED,
          actorType: SecurityAuditActorType.USER,
          actorUserId: input.actorUserId,
          source: SecurityAuditSource.HTTP_REQUEST,
          reason,
          payloadJson: audit as Prisma.InputJsonValue,
        },
        tx,
      );
      await this.paymentRepository.createEvent(
        {
          paymentId: payment.id,
          eventType: PaymentEventType.REFUND_PROCESSED,
          actorType: SecurityAuditActorType.USER,
          actorUserId: input.actorUserId,
          source: SecurityAuditSource.HTTP_REQUEST,
          reason,
          payloadJson: {
            ...audit,
            outcome: 'SUCCEEDED_CUSTOMER_WALLET',
          } as Prisma.InputJsonValue,
        },
        tx,
      );

      if (finalAmount.gt(0)) {
        await this.walletAccounting.creditRefundToWallet({
          patientId: purchase.patientId,
          paymentId: payment.id,
          refundId: refund.id,
          sessionId: null,
          currencyCode: payment.currencyCode,
          amount: finalAmount.toFixed(2),
          tx,
        });
        await this.paymentRepository.updateRefund(
          refund.id,
          { customerWalletCreditedAt: now },
          tx,
        );
      }

      const priorSucceeded = await tx.refund.aggregate({
        where: { paymentId: payment.id, status: RefundStatus.SUCCEEDED },
        _sum: { amount: true },
      });
      const cumulative = priorSucceeded._sum.amount ?? new Prisma.Decimal(0);
      const targetStatus = cumulative.gte(payment.amountTotal)
        ? PaymentStatus.REFUNDED
        : finalAmount.gt(0)
          ? PaymentStatus.PARTIALLY_REFUNDED
          : payment.status;
      if (targetStatus !== payment.status) {
        this.paymentTransitions.assertCanTransition(payment.status, targetStatus);
        await tx.payment.update({ where: { id: payment.id }, data: { status: targetStatus } });
      }

      // Keep the refund's financial posting on the canonical refund journal,
      // but mark it as package-policy metadata so recognized package earnings
      // are not repriced or clawed back.
      await this.postRefundLedgerEntries.execute({ refundId: refund.id, tx });

      for (const session of purchase.sessions) {
        if (!PACKAGE_RESERVED_SESSION_STATUSES.has(session.status)) continue;
        await this.sessionLifecycle.transitionIfCurrentStatus({
          sessionId: session.id,
          expectedStatuses: [session.status],
          to: SessionStatus.CANCELLED,
          tx,
          actorUserId: input.actorUserId,
          actorType: SecurityAuditActorType.USER,
          actorRoles: ['ADMIN'],
          source: SecurityAuditSource.HTTP_REQUEST,
          reason: 'PACKAGE_REFUNDED',
          metadata: {
            packagePurchaseId: purchase.id,
            refundId: refund.id,
            packageRefundPolicy: true,
          },
        });
      }

      const existingMetadata = (purchase.metadataJson ?? {}) as Record<string, unknown>;
      await this.purchaseRepository.updateStatus(
        purchase.id,
        {
          status: 'REFUNDED',
          refundedAt: now,
          metadataJson: {
            ...existingMetadata,
            packageRefund: audit,
          } as Prisma.InputJsonValue,
        },
        tx,
      );
      if (await tx.packageSettlement.findUnique({ where: { purchaseId: purchase.id } })) {
        const settlement = await tx.packageSettlement.findUniqueOrThrow({ where: { purchaseId: purchase.id } });
        const settlementMetadata = (settlement.metadataJson ?? {}) as Record<string, unknown>;
        await tx.packageSettlement.update({
          where: { purchaseId: purchase.id },
          data: {
            status: 'REFUNDED_OR_ADJUSTED',
            reviewedAt: now,
            reviewedByAdminId: input.actorUserId,
            releasablePractitionerAmount: new Prisma.Decimal(0),
            decision: 'PACKAGE_REFUND',
            notes: reason.slice(0, 1000),
            metadataJson: {
              ...settlementMetadata,
              packageRefund: audit,
            } as Prisma.InputJsonValue,
          },
        });
      }

      const finalRefund = await tx.refund.findUniqueOrThrow({
        where: { id: refund.id },
        include: { session: { select: { sessionCode: true } } },
      });
      return { refund: finalRefund, alreadyFinalized: false };
    });

    return result;
  }

  async finalizeByPaymentId(input: {
    paymentId: string;
    actorUserId: string;
    finalAmount?: string | number | null;
    reason: string;
    evidenceReference?: string | null;
    idempotencyKey?: string | null;
  }) {
    const purchase = await this.purchaseRepository.findByPaymentId(input.paymentId);
    if (!purchase) {
      throw new NotFoundException({ error: 'PACKAGE_PURCHASE_NOT_FOUND' });
    }
    return this.finalize({ ...input, purchaseId: purchase.id });
  }

  private async buildPreview(purchase: any, tx?: Prisma.TransactionClient): Promise<PackageRefundPreview> {
    const payment = purchase.payment;
    if (!payment) throw new BadRequestException({ error: 'PACKAGE_PAYMENT_REQUIRED' });
    const summary = this.entitlementService.summarize(
      purchase.sessionCountSnapshot,
      purchase.sessions,
    );
    const netPaid = new Prisma.Decimal(
      purchase.patientPayableTotalSnapshot ?? payment.amountTotal,
    ).toDecimalPlaces(2);
    const prior = tx
      ? await tx.refund.aggregate({
          where: { paymentId: payment.id, status: RefundStatus.SUCCEEDED },
          _sum: { amount: true },
        })
      : await this.paymentRepository.sumSucceededRefundAmountByPaymentId(payment.id);
    const priorRefunded = (prior._sum.amount ?? new Prisma.Decimal(0)).toDecimalPlaces(2);
    const maxFinal = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      new Prisma.Decimal(payment.amountTotal).sub(priorRefunded),
    ).toDecimalPlaces(2);
    const snapshot = purchase.selectedBaseSessionPriceSnapshot
      ? new Prisma.Decimal(purchase.selectedBaseSessionPriceSnapshot).toDecimalPlaces(2)
      : null;
    const currencyMatches =
      !purchase.selectedCurrencyCode ||
      purchase.selectedCurrencyCode.toUpperCase() === payment.currencyCode.toUpperCase();
    const manualReviewRequired = !snapshot || !currencyMatches;
    const manualReviewReason = !snapshot
      ? 'MANUAL_PRICE_REVIEW_REQUIRED'
      : !currencyMatches
        ? 'PRICE_SNAPSHOT_CURRENCY_MISMATCH'
        : null;
    const usedValue = snapshot
      ? snapshot.mul(summary.consumedSessions).toDecimalPlaces(2)
      : null;
    const suggested = usedValue
      ? Prisma.Decimal.max(new Prisma.Decimal(0), netPaid.sub(usedValue)).toDecimalPlaces(2)
      : null;
    const future = purchase.sessions.filter((session: any) =>
      PACKAGE_RESERVED_SESSION_STATUSES.has(session.status),
    );
    return {
      packagePurchaseId: purchase.id,
      patient: {
        id: purchase.patient.id,
        displayName: purchase.patient.user?.displayName ?? null,
      },
      practitioner: {
        id: purchase.practitioner.id,
        displayName: purchase.practitioner.user?.displayName ?? null,
      },
      packageName: purchase.titleSnapshot,
      currency: payment.currencyCode,
      packageNetPaid: netPaid.toFixed(2),
      totalSessions: purchase.sessionCountSnapshot,
      usedSessions: summary.consumedSessions,
      unusedSessions: Math.max(0, purchase.sessionCountSnapshot - summary.consumedSessions),
      reservedSessions: summary.reservedSessions,
      standalonePriceSnapshot: snapshot?.toFixed(2) ?? null,
      standaloneSnapshots: snapshot ? [snapshot.toFixed(2)] : [],
      usedStandaloneValue: usedValue?.toFixed(2) ?? null,
      suggestedRefundAmount: suggested?.toFixed(2) ?? null,
      priorRefundedAmount: priorRefunded.toFixed(2),
      maxFinalRefundAmount: maxFinal.toFixed(2),
      futureSessionsAffected: future.length,
      futureSessionIds: future.map((session: any) => session.id),
      packageStatus: purchase.status,
      manualReviewRequired,
      manualReviewReason,
    };
  }
}
