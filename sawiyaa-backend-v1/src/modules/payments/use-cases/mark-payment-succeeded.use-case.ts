import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentEventType,
  PaymentPurpose,
  PaymentProvider,
  PaymentStatus,
  Payment,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { AccountingJournalPostingService } from '@modules/financial-operations/services/accounting-journal-posting.service';
import { RedeemCouponUseCase } from '@modules/financial-rules/use-cases/redeem-coupon.use-case';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrchestrateSessionPaymentStatusService } from '../services/orchestrate-session-payment-status.service';
import { OrchestrateAcademyProgramEnrollmentPaymentStatusService } from '../services/orchestrate-academy-program-enrollment-payment-status.service';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';
import { ReconcilePackagePurchasePaymentUseCase } from '@modules/package-plans/use-cases/reconcile-package-purchase-payment.use-case';
import { CorporateSponsorshipConsumeService } from '@modules/corporate-sponsorship/services/corporate-sponsorship-consume.service';
import {
  SecurityAuditActorType as AuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';

@Injectable()
export class MarkPaymentSucceededUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly orchestrateSessionPaymentStatusService: OrchestrateSessionPaymentStatusService,
    private readonly orchestrateAcademyProgramEnrollmentPaymentStatusService: OrchestrateAcademyProgramEnrollmentPaymentStatusService,
    private readonly paymentMapper: PaymentMapper,
    private readonly sessionEarningReviewService: SessionEarningReviewService,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
    private readonly redeemCouponUseCase: RedeemCouponUseCase,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly reconcilePackagePurchasePaymentUseCase: ReconcilePackagePurchasePaymentUseCase,
    private readonly corporateSponsorshipConsumeService: CorporateSponsorshipConsumeService,
    private readonly logger: AppLoggerService,
    private readonly accountingJournalPostingService: AccountingJournalPostingService,
  ) {}

  async execute(input: {
    paymentId: string;
    providerEventRef: string;
    payload: Record<string, unknown>;
  }) {
    const payment = await this.paymentRepository.findById(input.paymentId);

    if (!payment) {
      throw new NotFoundException({
        messageKey: 'payments.errors.paymentNotFound',
        error: 'PAYMENT_NOT_FOUND',
      });
    }

    const paymobPaymentMethod = this.resolvePaymobPaymentMethodSnapshot(
      payment.provider,
      input.payload,
    );

    let confirmedSessionId: string | null = null;
    const updated = await this.prisma.$transaction(async (tx) => {
      // Match cancellation's order: session row, payment, wallet reservation.
      if (payment.sessionId) {
        await tx.$executeRaw`SELECT id FROM "Session" WHERE id = ${payment.sessionId}::uuid FOR UPDATE`;
      }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.id})::bigint)`;
      const current = await this.paymentRepository.findById(payment.id, tx);
      if (!current) throw new NotFoundException({ error: 'PAYMENT_NOT_FOUND' });
      this.validatePaymentStatusTransitionService.assertCanTransition(
        current.status,
        PaymentStatus.CAPTURED,
      );
      const alreadyCaptured = current.status === PaymentStatus.CAPTURED;
      const receipt = await this.paymentRepository.findWebhookReceipt(
        current.provider,
        input.providerEventRef,
        tx,
      );
      if (!receipt) {
        await this.paymentRepository.createWebhookReceipt(
          {
            provider: payment.provider,
            providerEventRef: input.providerEventRef,
            paymentId: payment.id,
          },
          tx,
        );
      }

      if (!alreadyCaptured) {
        await this.paymentRepository.createEvent(
          {
            paymentId: payment.id,
            eventType: PaymentEventType.PROVIDER_WEBHOOK_RECEIVED,
            providerEventRef: input.providerEventRef,
            previousStatus: current.status,
            payloadJson: input.payload as Prisma.InputJsonValue,
          },
          tx,
        );
      }

      const captured = alreadyCaptured
        ? current
        : await this.paymentRepository.updateStatus(
            payment.id,
            {
              status: PaymentStatus.CAPTURED,
              capturedAt: new Date(),
              metadataJson: {
                ...((current.metadataJson ?? {}) as Record<string, unknown>),
                ...(paymobPaymentMethod
                  ? {
                      paymobPaymentMethod,
                    }
                  : {}),
              },
            },
            tx,
          );

      if (!alreadyCaptured)
        await this.paymentRepository.createEvent(
          {
            paymentId: payment.id,
            eventType: PaymentEventType.PAYMENT_CAPTURED,
            providerEventRef: input.providerEventRef,
            actorType: AuditActorType.PAYMENT_WEBHOOK,
            source: SecurityAuditSource.PAYMENT_WEBHOOK,
            previousStatus: current.status,
            newStatus: PaymentStatus.CAPTURED,
          },
          tx,
        );

      const sponsorshipId = (payment.metadataJson as Record<string, unknown>)
        ?.sponsorshipId as string | undefined;
      const hasValidSponsorshipMetadata =
        typeof sponsorshipId === 'string' &&
        sponsorshipId.length > 0 &&
        typeof payment.sessionId === 'string';
      if (hasValidSponsorshipMetadata) {
        await this.corporateSponsorshipConsumeService.consumeAfterPayment(
          {
            sponsorshipId,
            sessionId: payment.sessionId!,
            paymentId: payment.id,
            paidAmount: captured.amountTotal.toFixed(2),
            currency: captured.currencyCode,
          },
          tx,
        );
      }

      const isAcademy =
        current.paymentPurpose === PaymentPurpose.ACADEMY_PROGRAM_ENROLLMENT ||
        (current.metadataJson as Record<string, unknown> | null)?.source ===
          'academy-program-enrollment';
      if (
        !isAcademy &&
        current.paymentPurpose !== PaymentPurpose.SESSION_PACKAGE_PURCHASE
      ) {
        if (captured.amountFromWallet.gt(0)) {
          await this.customerWalletAccountingService.captureReservationForPayment(
            {
              paymentId: captured.id,
              currencyCode: captured.currencyCode,
              tx,
            },
          );
        }
        await this.redeemCouponUseCase.execute({
          couponId: captured.couponId,
          couponCode: captured.couponCodeSnapshot ?? null,
          sessionId: captured.sessionId,
          paymentId: captured.id,
          patientId: captured.patientId ?? '',
          practitionerId: captured.practitionerId,
          currencyCode: captured.currencyCode,
          grossAmount: captured.amountSubtotal.toString(),
          discountAmount: captured.amountDiscount.toString(),
          couponPlatformSharePercent:
            captured.couponPlatformShareSnapshot?.toString() ?? null,
          couponPractitionerSharePercent:
            captured.couponPractitionerShareSnapshot?.toString() ?? null,
          tx,
        });
        if (captured.sessionId) {
          const session = await tx.session.findUnique({
            where: { id: captured.sessionId },
          });
          if (session?.status === 'PENDING_PAYMENT') {
            await this.orchestrateSessionPaymentStatusService.markSessionConfirmedFromPayment(
              { session, tx },
            );
            confirmedSessionId = session.id;
          }
          await this.sessionEarningReviewService.syncForSessionCompletion({
            sessionId: captured.sessionId,
            tx,
          });
        }
      }

      await this.accountingJournalPostingService.postPaymentCaptured({
        payment: captured,
        tx,
      });
      return captured;
    });

    if (confirmedSessionId) {
      await this.orchestrateSessionPaymentStatusService.notifySessionConfirmedAfterCommit(
        confirmedSessionId,
      );
    }

    const paymentMetadata = (payment.metadataJson ?? {}) as Record<
      string,
      unknown
    >;
    const isAcademyProgramEnrollment =
      payment.paymentPurpose === PaymentPurpose.ACADEMY_PROGRAM_ENROLLMENT ||
      paymentMetadata.source === 'academy-program-enrollment';

    if (payment.paymentPurpose === PaymentPurpose.SESSION_PACKAGE_PURCHASE) {
      await this.reconcilePackagePurchasePaymentUseCase.execute({
        paymentId: payment.id,
        providerEventRef: input.providerEventRef,
        payload: input.payload,
        payment: updated,
      });

      if (updated.patientId) {
        const packagePurchaseDelegate = (
          this.prisma as PrismaClient
        ).patientPackagePurchase;
        const packagePurchase = packagePurchaseDelegate
          ? await packagePurchaseDelegate.findFirst({
              where: { paymentId: updated.id },
              include: { packagePlan: { select: { title: true, code: true } } },
            })
          : null;
        if (packagePurchase) {
          await this.operationalNotificationService.notifyPackagePurchaseSucceeded({
            patientProfileId: updated.patientId,
            packagePurchaseId: packagePurchase.id,
            amount: updated.amountTotal.toString(),
            currencyCode: updated.currencyCode,
            packageName:
              packagePurchase.packagePlan?.title ??
              packagePurchase.titleSnapshot ??
              packagePurchase.planCodeSnapshot ??
              undefined,
          });
        }
      }

      this.logger.info(
        {
          message: 'Payment marked as succeeded',
          paymentId: payment.id,
          provider: payment.provider,
          providerEventRef: input.providerEventRef,
        },
        undefined,
        'Payments',
      );

      return {
        item: this.paymentMapper.toViewModel(updated),
      };
    }

    if (isAcademyProgramEnrollment) {
      await this.orchestrateAcademyProgramEnrollmentPaymentStatusService.markEnrollmentConfirmedFromPayment(
        payment.id,
      );

      if (updated.patientId) {
        const enrollmentDelegate = (
          this.prisma as PrismaClient
        ).academyProgramEnrollment;
        const enrollment = enrollmentDelegate
          ? await enrollmentDelegate.findFirst({
              where: { paymentId: updated.id },
              include: {
                academyProgram: { select: { titleAr: true, titleEn: true } },
              },
            })
          : null;
        if (enrollment) {
          await this.operationalNotificationService.notifyAcademyPaymentSucceeded({
            patientProfileId: updated.patientId,
            enrollmentId: enrollment.id,
            amount: updated.amountTotal.toString(),
            currencyCode: updated.currencyCode,
            trainingName: enrollment.academyProgram.titleEn ?? enrollment.academyProgram.titleAr,
          });
        }
      }
    }

    this.logger.info(
      {
        message: 'Payment marked as succeeded',
        paymentId: payment.id,
        provider: payment.provider,
        providerEventRef: input.providerEventRef,
      },
      undefined,
      'Payments',
    );

    if (!isAcademyProgramEnrollment && updated.patientId) {
      await this.operationalNotificationService.notifyPaymentSucceeded({
        patientProfileId: updated.patientId,
        paymentId: updated.id,
        amount: updated.amountTotal.toString(),
        currencyCode: updated.currencyCode,
      });
    }

    return {
      item: this.paymentMapper.toViewModel(updated),
    };
  }

  private resolvePaymobPaymentMethodSnapshot(
    provider: Payment['provider'],
    payload: Record<string, unknown>,
  ): string | null {
    if (provider !== PaymentProvider.PAYMOB) {
      return null;
    }

    const sourceData = payload.source_data;
    if (!sourceData || typeof sourceData !== 'object') {
      return null;
    }

    const source = sourceData as Record<string, unknown>;
    const type = typeof source.type === 'string' ? source.type.trim() : '';
    const subType =
      typeof source.sub_type === 'string' ? source.sub_type.trim() : '';
    const candidate = type || subType;

    return candidate ? candidate.toUpperCase() : null;
  }
}
