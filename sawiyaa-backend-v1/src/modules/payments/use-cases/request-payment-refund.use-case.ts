import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentEventType,
  RefundEventType,
  PaymentProvider,
  RefundDestination,
  PaymentStatus,
  Prisma,
  Refund,
  RefundStatus,
  RefundType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AppLoggerService } from '@common/logging/app-logger.service';
import { PostRefundLedgerEntriesUseCase } from '@modules/financial-operations/use-cases/post-refund-ledger-entries.use-case';
import { SessionEarningReviewService } from '@modules/financial-operations/services/session-earning-review.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { CustomerWalletAccountingService } from '@modules/customer-wallets/services/customer-wallet-accounting.service';
import { PaymentMapper } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrchestrateSessionPaymentStatusService } from '../services/orchestrate-session-payment-status.service';
import { PaymentProviderRegistryService } from '../services/payment-provider-registry.service';
import { ValidatePaymentStatusTransitionService } from '../services/validate-payment-status-transition.service';
import { ValidateRefundEligibilityService } from '../services/validate-refund-eligibility.service';
import { toGatewayMinorUnits } from '../utils/money-units.util';
import { PaymentProviderReconciliationResult } from '../providers/payment-provider-adapter.interface';
import {
  SecurityAuditActorType as AuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';

@Injectable()
export class RequestPaymentRefundUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProviderRegistryService: PaymentProviderRegistryService,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly validateRefundEligibilityService: ValidateRefundEligibilityService,
    private readonly postRefundLedgerEntriesUseCase: PostRefundLedgerEntriesUseCase,
    private readonly sessionEarningReviewService: SessionEarningReviewService,
    private readonly customerWalletAccountingService: CustomerWalletAccountingService,
    private readonly orchestrateSessionPaymentStatusService: OrchestrateSessionPaymentStatusService,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly paymentMapper: PaymentMapper,
    private readonly logger: AppLoggerService,
  ) {}

  async execute(input: {
    paymentId: string;
    actorUserId: string;
    amount?: string | null;
    reason?: string | null;
    destination?: RefundDestination;
    retryRefundId?: string | null;
  }) {
    const payment = await this.paymentRepository.findById(input.paymentId);

    if (!payment) {
      throw new NotFoundException({
        messageKey: 'payments.errors.paymentNotFound',
        error: 'PAYMENT_NOT_FOUND',
      });
    }

    this.validateRefundEligibilityService.assertPaymentRefundable(
      payment.status,
    );

    if (
      input.destination === RefundDestination.ORIGINAL_METHOD &&
      payment.amountFromWallet.gt(0)
    ) {
      throw new BadRequestException({
        messageKey:
          'payments.errors.originalMethodRefundNotAllowedForWalletSplit',
        error: 'PAYMENT_ORIGINAL_METHOD_REFUND_NOT_ALLOWED_FOR_WALLET_SPLIT',
      });
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.id})::bigint)`;
      const currentPayment = await this.paymentRepository.findById(
        payment.id,
        tx,
      );
      if (!currentPayment)
        throw new NotFoundException({ error: 'PAYMENT_NOT_FOUND' });
      this.validateRefundEligibilityService.assertPaymentRefundable(
        currentPayment.status,
      );
      if (currentPayment.paymentPurpose === 'SESSION_PACKAGE_PURCHASE') {
        const currencies = await tx.ledgerEntry.findMany({
          where: {
            paymentId: payment.id,
            entryType: 'PRACTITIONER_EARNING',
            direction: 'CREDIT',
          },
          distinct: ['currencyCode'],
          select: { currencyCode: true },
        });
        // The current recovery model has one currency per refund. Reject this
        // unsupported historical case before asking a gateway to return funds.
        if (currencies.length > 1)
          throw new BadRequestException({
            error: 'REFUND_REQUIRES_MULTI_CURRENCY_RECOVERY_REVIEW',
          });
      }

      let previousRefundStatus: RefundStatus | null = null;
      let created: Refund;
      if (input.retryRefundId) {
        const existing = await this.paymentRepository.findRefundById(
          input.retryRefundId,
          tx,
        );
        if (!existing || existing.paymentId !== payment.id) {
          throw new NotFoundException({
            messageKey: 'payments.errors.refundNotFound',
            error: 'PAYMENT_REFUND_NOT_FOUND',
          });
        }

        this.validateRefundEligibilityService.assertRetryableRefundStatus(
          existing.status,
        );
        const active = await this.paymentRepository.findActiveRefundByPaymentId(
          payment.id,
          tx,
        );
        this.validateRefundEligibilityService.assertNoActiveRefund(active);
        const refunded =
          await this.paymentRepository.sumSucceededRefundAmountByPaymentId(
            payment.id,
            tx,
          );
        this.validateRefundEligibilityService.resolveRefundAmount({
          paymentAmountTotal: currentPayment.amountTotal,
          alreadyRefundedAmount: refunded._sum.amount ?? new Prisma.Decimal(0),
          requestedAmount: existing.amount.toFixed(2),
        });
        previousRefundStatus = existing.status;
        created = await this.paymentRepository.updateRefund(
          existing.id,
          {
            status: RefundStatus.REQUESTED,
            failedAt: null,
            processedAt: null,
            refundReason: input.reason ?? existing.refundReason ?? null,
            providerRefundRef: null,
            destination: input.destination ?? existing.destination,
            metadataJson: {
              ...((existing.metadataJson as Record<string, unknown> | null) ??
                {}),
              source: 'manual-refund-request',
              actorUserId: input.actorUserId,
              requestedDestination: input.destination ?? existing.destination,
              retryOfRefundId: existing.id,
            },
          },
          tx,
        );
      } else {
        const activeRefund =
          await this.paymentRepository.findActiveRefundByPaymentId(
            payment.id,
            tx,
          );
        this.validateRefundEligibilityService.assertNoActiveRefund(
          activeRefund,
        );

        const aggregate =
          await this.paymentRepository.sumSucceededRefundAmountByPaymentId(
            payment.id,
            tx,
          );
        const alreadyRefunded = aggregate._sum.amount ?? new Prisma.Decimal(0);
        const resolvedAmount =
          this.validateRefundEligibilityService.resolveRefundAmount({
            paymentAmountTotal: payment.amountTotal,
            alreadyRefundedAmount: alreadyRefunded,
            requestedAmount: input.amount ?? null,
          });

        created = await this.paymentRepository.createRefund(
          {
            paymentId: payment.id,
            sessionId: payment.sessionId ?? null,
            refundType: resolvedAmount.isFullRefund
              ? RefundType.FULL
              : RefundType.PARTIAL,
            status: RefundStatus.REQUESTED,
            destination: input.destination ?? RefundDestination.CUSTOMER_WALLET,
            refundReason: input.reason ?? null,
            amount: resolvedAmount.amount.toFixed(2),
            currencyCode: payment.currencyCode,
            actorType: AuditActorType.USER,
            actorUserId: input.actorUserId,
            source: SecurityAuditSource.HTTP_REQUEST,
            metadataJson: {
              source: 'manual-refund-request',
              actorUserId: input.actorUserId,
              requestedDestination:
                input.destination ?? RefundDestination.CUSTOMER_WALLET,
              requestedAmount: resolvedAmount.amount.toFixed(2),
              alreadyRefundedAmount: alreadyRefunded.toFixed(2),
              paymentAmountTotal: payment.amountTotal.toFixed(2),
            },
          },
          tx,
        );
      }

      await this.paymentRepository.createEvent(
        {
          paymentId: payment.id,
          eventType: PaymentEventType.REFUND_REQUESTED,
          actorType: AuditActorType.USER,
          actorUserId: input.actorUserId,
          source: SecurityAuditSource.HTTP_REQUEST,
          reason: input.reason ?? null,
          payloadJson: {
            refundId: created.id,
            amount: created.amount.toString(),
            currency: created.currencyCode,
            actorUserId: input.actorUserId,
          },
        },
        tx,
      );

      await this.paymentRepository.createRefundEvent(
        {
          refundId: created.id,
          paymentId: payment.id,
          sessionId: created.sessionId,
          eventType: input.retryRefundId
            ? RefundEventType.RETRIED
            : RefundEventType.REQUESTED,
          previousStatus: previousRefundStatus,
          newStatus: created.status,
          destination: created.destination,
          amount: created.amount,
          currencyCode: created.currencyCode,
          actorType: AuditActorType.USER,
          actorUserId: input.actorUserId,
          source: SecurityAuditSource.HTTP_REQUEST,
          reason: input.reason ?? null,
          idempotencyKey: input.retryRefundId ?? null,
        },
        tx,
      );

      if (currentPayment.status !== PaymentStatus.REFUND_PENDING) {
        this.validatePaymentStatusTransitionService.assertCanTransition(
          currentPayment.status,
          PaymentStatus.REFUND_PENDING,
        );

        await this.paymentRepository.updateStatus(
          payment.id,
          {
            status: PaymentStatus.REFUND_PENDING,
          },
          tx,
        );
      }

      return created;
    });

    if (refund.destination === RefundDestination.CUSTOMER_WALLET) {
      const finalized = await this.finalizeWalletRefundOutcome({
        payment,
        refundId: refund.id,
      });

      this.logger.info(
        {
          message: 'Refund credited to customer wallet',
          paymentId: payment.id,
          refundId: refund.id,
          destination: refund.destination,
        },
        undefined,
        'Payments',
      );

      return {
        item: this.paymentMapper.toRefundViewModel(finalized),
      };
    }

    if (payment.patientId) {
      await this.operationalNotificationService.notifyRefundRequested({
        patientProfileId: payment.patientId,
        refundId: refund.id,
        amount: refund.amount.toString(),
        currencyCode: refund.currencyCode,
      });
    }

    if (payment.sessionId) {
      await this.orchestrateSessionPaymentStatusService.markSessionRefundPending(
        payment.sessionId,
      );
    }

    const providerAdapter = this.paymentProviderRegistryService.get(
      payment.provider,
    );
    await this.markProviderRefundDispatchStarted({
      paymentId: payment.id,
      refundId: refund.id,
    });
    const providerTransactionRef =
      payment.provider === PaymentProvider.PAYMOB
        ? await this.resolvePaymobTransactionRef(payment.id)
        : null;

    let providerResult: {
      providerRefundRef: string | null;
      outcome: 'SUCCEEDED' | 'PROCESSING' | 'FAILED';
      metadata?: Record<string, unknown>;
    } | null = null;

    try {
      providerResult = await providerAdapter.refundPayment({
        refundId: refund.id,
        paymentId: payment.id,
        providerPaymentRef: payment.providerPaymentRef ?? null,
        providerOrderRef: payment.providerOrderRef ?? null,
        providerTransactionRef,
        amountMinor: toGatewayMinorUnits(refund.amount, refund.currencyCode),
        currency: payment.currencyCode,
        reason: input.reason ?? null,
      });
    } catch {
      providerResult = {
        providerRefundRef: null,
        outcome: 'PROCESSING',
        metadata: {
          error: 'provider_refund_outcome_unknown_requires_reconciliation',
        },
      };
    }

    const finalized = await this.finalizeRefundOutcome({
      payment,
      refundId: refund.id,
      providerRefundRef: providerResult.providerRefundRef,
      providerOutcome: providerResult.outcome,
      providerPayload: providerResult.metadata ?? {},
    });

    this.logger.info(
      {
        message: 'Refund request processed',
        paymentId: payment.id,
        refundId: refund.id,
        provider: payment.provider,
        outcome: providerResult.outcome,
      },
      undefined,
      'Payments',
    );

    return {
      item: this.paymentMapper.toRefundViewModel(finalized),
    };
  }

  async reconcileProviderRefund(refundId: string) {
    const refund = await this.paymentRepository.findRefundById(refundId);
    if (!refund) {
      throw new NotFoundException({ error: 'PAYMENT_REFUND_NOT_FOUND' });
    }
    if (
      refund.status === RefundStatus.SUCCEEDED ||
      refund.status === RefundStatus.FAILED
    ) {
      return refund;
    }

    const payment = await this.paymentRepository.findById(refund.paymentId);
    if (!payment || payment.provider === PaymentProvider.INTERNAL_WALLET) {
      return refund;
    }

    const providerTransactionRef =
      payment.provider === PaymentProvider.PAYMOB
        ? await this.resolvePaymobTransactionRef(payment.id)
        : null;
    const prior =
      await this.paymentRepository.sumSucceededRefundAmountByPaymentId(
        payment.id,
      );
    const expectedAmountMinor = toGatewayMinorUnits(
      refund.amount,
      refund.currencyCode,
    );
    let result: PaymentProviderReconciliationResult;
    try {
      result = await this.paymentProviderRegistryService
        .get(payment.provider)
        .reconcileRefund({
          refundId: refund.id,
          paymentId: payment.id,
          providerPaymentRef: payment.providerPaymentRef ?? null,
          providerOrderRef: payment.providerOrderRef ?? null,
          providerTransactionRef,
          providerRefundRef: refund.providerRefundRef ?? null,
          amountMinor: expectedAmountMinor,
          priorSucceededRefundMinor: toGatewayMinorUnits(
            prior._sum.amount ?? new Prisma.Decimal(0),
            refund.currencyCode,
          ),
          currency: refund.currencyCode,
        });
    } catch (error) {
      result = {
        outcome: 'UNKNOWN' as const,
        evidence: {
          source: 'provider-reconciliation',
          error: error instanceof Error ? error.name : 'provider-query-failed',
        },
      };
    }

    const amountMatches =
      result.amountMinor == null || result.amountMinor === expectedAmountMinor;
    const currencyMatches =
      result.currencyCode == null ||
      result.currencyCode.toUpperCase() === refund.currencyCode.toUpperCase();
    const trustedOutcome =
      amountMatches && currencyMatches ? result.outcome : 'UNKNOWN';
    const previousMetadata =
      (refund.metadataJson as Record<string, unknown> | null) ?? {};
    const previousAttempts = Number(
      (
        previousMetadata.providerReconciliation as
          | Record<string, unknown>
          | undefined
      )?.attempts ?? 0,
    );
    await this.paymentRepository.updateRefund(refund.id, {
      providerRefundRef:
        result.providerRefundRef ?? refund.providerRefundRef ?? null,
      metadataJson: {
        ...previousMetadata,
        providerReconciliation: {
          attempts: previousAttempts + 1,
          lastAttemptAt: new Date().toISOString(),
          outcome: trustedOutcome,
          amountMatches,
          currencyMatches,
          evidence: result.evidence,
        },
      } as Prisma.InputJsonValue,
    });

    return this.finalizeRefundOutcome({
      payment,
      refundId: refund.id,
      providerRefundRef:
        result.providerRefundRef ?? refund.providerRefundRef ?? null,
      providerOutcome:
        trustedOutcome === 'SUCCEEDED'
          ? 'SUCCEEDED'
          : trustedOutcome === 'FAILED'
            ? 'FAILED'
            : 'PROCESSING',
      providerPayload: {
        source: 'provider-reconciliation',
        outcome: trustedOutcome,
        amountMatches,
        currencyMatches,
        evidence: result.evidence,
      },
    });
  }

  /**
   * Final safety valve for an external Paymob operation whose official
   * reconciliation endpoint has recorded an inconclusive result. This command
   * deliberately accepts evidence only; the refund, payment, amount and
   * currency are always reloaded under the financial locks.
   */
  async manuallyFinalizeProviderRefund(input: {
    paymentId: string;
    refundId: string;
    actorUserId: string;
    outcome: 'SUCCEEDED' | 'FAILED';
    evidenceReference: string;
    reason: string;
    evidenceMetadata?: Record<string, string>;
  }) {
    const prepared = await this.prisma.$transaction(async (tx) => {
      const refund = await this.paymentRepository.findRefundById(
        input.refundId,
        tx,
      );
      if (!refund) {
        throw new NotFoundException({ error: 'PAYMENT_REFUND_NOT_FOUND' });
      }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${refund.paymentId})::bigint)`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${refund.id})::bigint)`;

      const current = await this.paymentRepository.findRefundById(
        refund.id,
        tx,
      );
      if (!current) {
        throw new NotFoundException({ error: 'PAYMENT_REFUND_NOT_FOUND' });
      }
      if (current.paymentId !== input.paymentId) {
        throw new NotFoundException({ error: 'PAYMENT_REFUND_NOT_FOUND' });
      }
      const payment = await this.paymentRepository.findById(
        current.paymentId,
        tx,
      );
      if (!payment) {
        throw new NotFoundException({ error: 'PAYMENT_NOT_FOUND' });
      }
      if (
        current.status === RefundStatus.SUCCEEDED ||
        current.status === RefundStatus.FAILED
      ) {
        return { payment, refund: current, alreadyFinalized: true };
      }
      const reconciliation = (
        (current.metadataJson as Record<string, unknown> | null) ?? {}
      ).providerReconciliation as Record<string, unknown> | undefined;
      if (
        payment.provider !== PaymentProvider.PAYMOB ||
        current.status !== RefundStatus.PROCESSING ||
        reconciliation?.outcome !== 'UNKNOWN'
      ) {
        throw new BadRequestException({
          error: 'REFUND_MANUAL_FINALIZATION_NOT_ALLOWED',
          messageKey: 'payments.errors.manualFinalizationNotAllowed',
        });
      }

      await this.paymentRepository.createRefundEvent(
        {
          refundId: current.id,
          paymentId: current.paymentId,
          sessionId: current.sessionId,
          eventType: RefundEventType.PROVIDER_PENDING,
          previousStatus: current.status,
          newStatus: current.status,
          destination: current.destination,
          amount: current.amount,
          currencyCode: current.currencyCode,
          actorType: AuditActorType.USER,
          actorUserId: input.actorUserId,
          source: SecurityAuditSource.HTTP_REQUEST,
          reason: input.reason,
          commandReference: `manual-provider-finalization:${current.id}`,
          externalReference: input.evidenceReference,
          metadataJson: {
            action: 'MANUAL_PROVIDER_REFUND_FINALIZATION_REQUESTED',
            provider: payment.provider,
            refundId: current.id,
            paymentId: current.paymentId,
            outcome: input.outcome,
            evidenceReference: input.evidenceReference,
            evidenceMetadata: input.evidenceMetadata ?? {},
            automaticReconciliation:
              (reconciliation as Prisma.InputJsonValue | undefined) ?? null,
          },
        },
        tx,
      );
      return { payment, refund: current, alreadyFinalized: false };
    });

    if (prepared.alreadyFinalized) return prepared.refund;

    return this.finalizeRefundOutcome({
      payment: prepared.payment,
      refundId: prepared.refund.id,
      providerRefundRef: input.evidenceReference,
      providerOutcome: input.outcome,
      providerPayload: {
        source: 'manual-provider-evidence-finalization',
        operatorUserId: input.actorUserId,
        reason: input.reason,
        evidenceReference: input.evidenceReference,
        evidenceMetadata: input.evidenceMetadata ?? {},
        automaticReconciliation:
          (
            (prepared.refund.metadataJson as Record<string, unknown> | null) ??
            {}
          ).providerReconciliation ?? null,
      },
    });
  }

  private async markProviderRefundDispatchStarted(input: {
    paymentId: string;
    refundId: string;
  }) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.paymentId})::bigint)`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.refundId})::bigint)`;
      const current = await this.paymentRepository.findRefundById(
        input.refundId,
        tx,
      );
      if (!current || current.status !== RefundStatus.REQUESTED) return;
      const processing = await this.paymentRepository.updateRefund(
        input.refundId,
        { status: RefundStatus.PROCESSING },
        tx,
      );
      await this.paymentRepository.createRefundEvent(
        {
          refundId: processing.id,
          paymentId: input.paymentId,
          sessionId: processing.sessionId,
          eventType: RefundEventType.PROVIDER_PENDING,
          previousStatus: RefundStatus.REQUESTED,
          newStatus: RefundStatus.PROCESSING,
          destination: processing.destination,
          amount: processing.amount,
          currencyCode: processing.currencyCode,
          actorType: current.actorType,
          actorUserId: current.actorUserId,
          source: current.source,
          reason: 'PROVIDER_REFUND_DISPATCH_STARTED',
        },
        tx,
      );
    });
  }

  private async finalizeWalletRefundOutcome(input: {
    payment: {
      id: string;
      patientId: string | null;
      status: PaymentStatus;
      amountTotal: Prisma.Decimal;
      sessionId: string | null;
      currencyCode: string;
    };
    refundId: string;
  }) {
    const finalized = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.payment.id})::bigint)`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.refundId})::bigint)`;

      const currentRefund = await this.paymentRepository.findRefundById(
        input.refundId,
        tx,
      );

      if (!currentRefund) {
        throw new NotFoundException({
          messageKey: 'payments.errors.refundNotFound',
          error: 'PAYMENT_REFUND_NOT_FOUND',
        });
      }

      const updated =
        currentRefund.status === RefundStatus.SUCCEEDED
          ? await this.paymentRepository.updateRefund(
              input.refundId,
              {
                processedAt: currentRefund.processedAt ?? new Date(),
                providerRefundRef: null,
              },
              tx,
            )
          : await this.paymentRepository.updateRefund(
              input.refundId,
              {
                status: RefundStatus.SUCCEEDED,
                processedAt: new Date(),
                providerRefundRef: null,
              },
              tx,
            );

      if (currentRefund.status !== RefundStatus.SUCCEEDED) {
        await this.paymentRepository.createRefundEvent(
          {
            refundId: updated.id,
            paymentId: input.payment.id,
            sessionId: updated.sessionId,
            eventType: RefundEventType.WALLET_POSTED,
            previousStatus: currentRefund.status,
            newStatus: RefundStatus.SUCCEEDED,
            destination: updated.destination,
            amount: updated.amount,
            currencyCode: updated.currencyCode,
            actorType: currentRefund.actorType,
            actorUserId: currentRefund.actorUserId,
            source: currentRefund.source,
          },
          tx,
        );
        await this.paymentRepository.createEvent(
          {
            paymentId: input.payment.id,
            eventType: PaymentEventType.REFUND_PROCESSED,
            actorType: AuditActorType.USER,
            actorUserId: currentRefund.actorUserId,
            source: currentRefund.source ?? SecurityAuditSource.HTTP_REQUEST,
            previousStatus: PaymentStatus.REFUND_PENDING,
            newStatus: PaymentStatus.REFUND_PENDING,
            payloadJson: {
              refundId: input.refundId,
              outcome: 'SUCCEEDED_CUSTOMER_WALLET',
            },
          },
          tx,
        );
      }

      if (!input.payment.patientId) {
        throw new BadRequestException({
          messageKey: 'payments.errors.patientRequiredForWalletRefund',
          error: 'PAYMENT_PATIENT_REQUIRED_FOR_WALLET_REFUND',
        });
      }

      await this.customerWalletAccountingService.creditRefundToWallet({
        patientId: input.payment.patientId,
        paymentId: input.payment.id,
        refundId: updated.id,
        sessionId: input.payment.sessionId,
        currencyCode: updated.currencyCode,
        amount: updated.amount.toString(),
        tx,
      });

      await this.paymentRepository.updateRefund(
        updated.id,
        {
          customerWalletCreditedAt: new Date(),
        },
        tx,
      );

      const aggregate =
        await this.paymentRepository.sumSucceededRefundAmountByPaymentId(
          input.payment.id,
          tx,
        );
      const refunded = aggregate._sum.amount ?? new Prisma.Decimal(0);
      const isFullyRefunded = refunded.gte(input.payment.amountTotal);
      const targetStatus = isFullyRefunded
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

      this.validatePaymentStatusTransitionService.assertCanTransition(
        PaymentStatus.REFUND_PENDING,
        targetStatus,
      );

      await this.paymentRepository.updateStatus(
        input.payment.id,
        {
          status: targetStatus,
        },
        tx,
      );

      await this.postRefundLedgerEntriesUseCase.execute({
        refundId: updated.id,
        tx,
      });

      await this.sessionEarningReviewService.invalidatePendingReviewsForPayment(
        {
          paymentId: input.payment.id,
          internalReason: 'PAYMENT_REFUNDED_BEFORE_REVIEW_APPROVAL',
          tx,
        },
      );

      if (input.payment.sessionId) {
        if (isFullyRefunded) {
          await this.orchestrateSessionPaymentStatusService.markSessionRefunded(
            input.payment.sessionId,
            tx,
          );
        } else {
          await this.orchestrateSessionPaymentStatusService.markSessionRefundPending(
            input.payment.sessionId,
            tx,
          );
        }
      }

      return {
        refund: updated,
        isFullyRefunded,
      };
    });

    if (input.payment.patientId) {
      await this.operationalNotificationService.notifyRefundSucceeded({
        patientProfileId: input.payment.patientId,
        refundId: finalized.refund.id,
        amount: finalized.refund.amount.toString(),
        currencyCode: finalized.refund.currencyCode,
        financialEventType: 'REFUND_WALLET_CREDIT',
      });
    }

    const latest = await this.paymentRepository.findRefundById(
      finalized.refund.id,
    );
    if (!latest) {
      throw new NotFoundException({
        messageKey: 'payments.errors.refundNotFound',
        error: 'PAYMENT_REFUND_NOT_FOUND',
      });
    }

    return latest;
  }

  private async finalizeRefundOutcome(input: {
    payment: {
      id: string;
      patientId: string | null;
      status: PaymentStatus;
      amountTotal: Prisma.Decimal;
      sessionId: string | null;
    };
    refundId: string;
    providerRefundRef: string | null;
    providerOutcome: 'SUCCEEDED' | 'PROCESSING' | 'FAILED';
    providerPayload: Record<string, unknown>;
  }) {
    if (input.providerOutcome === 'PROCESSING') {
      return this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.payment.id})::bigint)`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.refundId})::bigint)`;
        const current = await this.paymentRepository.findRefundById(
          input.refundId,
          tx,
        );
        if (!current) {
          throw new NotFoundException({
            messageKey: 'payments.errors.refundNotFound',
            error: 'PAYMENT_REFUND_NOT_FOUND',
          });
        }
        if (
          current.status === RefundStatus.SUCCEEDED ||
          current.status === RefundStatus.FAILED
        )
          return current;
        const updated = await this.paymentRepository.updateRefund(
          input.refundId,
          {
            status: RefundStatus.PROCESSING,
            providerRefundRef: input.providerRefundRef,
            metadataJson: {
              ...((current.metadataJson ?? {}) as Record<string, unknown>),
              providerOutcome: input.providerPayload,
            } as Prisma.InputJsonValue,
          },
          tx,
        );
        await this.paymentRepository.createRefundEvent(
          {
            refundId: updated.id,
            paymentId: input.payment.id,
            sessionId: updated.sessionId,
            eventType: RefundEventType.PROVIDER_PENDING,
            previousStatus: current.status,
            newStatus: updated.status,
            destination: updated.destination,
            amount: updated.amount,
            currencyCode: updated.currencyCode,
            actorType: current.actorType,
            actorUserId: current.actorUserId,
            source: current.source,
            externalReference: input.providerRefundRef,
          },
          tx,
        );
        return updated;
      });
    }

    if (input.providerOutcome === 'FAILED') {
      const failed = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.payment.id})::bigint)`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.refundId})::bigint)`;

        const current = await this.paymentRepository.findRefundById(
          input.refundId,
          tx,
        );
        if (!current)
          throw new NotFoundException({ error: 'PAYMENT_REFUND_NOT_FOUND' });
        if (
          current.status === RefundStatus.SUCCEEDED ||
          current.status === RefundStatus.FAILED
        )
          return current;

        const failedRefund = await this.paymentRepository.updateRefund(
          input.refundId,
          {
            status: RefundStatus.FAILED,
            providerRefundRef: input.providerRefundRef,
            failedAt: new Date(),
          },
          tx,
        );

        await this.paymentRepository.createRefundEvent(
          {
            refundId: failedRefund.id,
            paymentId: input.payment.id,
            sessionId: failedRefund.sessionId,
            eventType: RefundEventType.FAILED,
            previousStatus: RefundStatus.PROCESSING,
            newStatus: RefundStatus.FAILED,
            destination: failedRefund.destination,
            amount: failedRefund.amount,
            currencyCode: failedRefund.currencyCode,
            actorType: failedRefund.actorType,
            actorUserId: failedRefund.actorUserId,
            source: failedRefund.source,
            externalReference: input.providerRefundRef,
          },
          tx,
        );

        const aggregate =
          await this.paymentRepository.sumSucceededRefundAmountByPaymentId(
            input.payment.id,
            tx,
          );
        const refunded = aggregate._sum.amount ?? new Prisma.Decimal(0);
        const targetStatus = refunded.gt(0)
          ? PaymentStatus.PARTIALLY_REFUNDED
          : PaymentStatus.CAPTURED;

        this.validatePaymentStatusTransitionService.assertCanTransition(
          PaymentStatus.REFUND_PENDING,
          targetStatus,
        );

        await this.paymentRepository.updateStatus(
          input.payment.id,
          {
            status: targetStatus,
          },
          tx,
        );

        return failedRefund;
      });

      if (input.payment.patientId && failed.status === RefundStatus.FAILED) {
        await this.operationalNotificationService.notifyRefundFailed({
          patientProfileId: input.payment.patientId,
          refundId: failed.id,
        });
      }

      return failed;
    }

    const succeeded = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.payment.id})::bigint)`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.refundId})::bigint)`;

      const currentRefund = await this.paymentRepository.findRefundById(
        input.refundId,
        tx,
      );
      if (!currentRefund) {
        throw new NotFoundException({
          messageKey: 'payments.errors.refundNotFound',
          error: 'PAYMENT_REFUND_NOT_FOUND',
        });
      }

      const updated =
        currentRefund.status === RefundStatus.SUCCEEDED
          ? await this.paymentRepository.updateRefund(
              input.refundId,
              {
                processedAt: currentRefund.processedAt ?? new Date(),
                providerRefundRef:
                  currentRefund.providerRefundRef ?? input.providerRefundRef,
              },
              tx,
            )
          : await this.paymentRepository.updateRefund(
              input.refundId,
              {
                status: RefundStatus.SUCCEEDED,
                providerRefundRef: input.providerRefundRef,
                processedAt: new Date(),
              },
              tx,
            );

      if (currentRefund.status !== RefundStatus.SUCCEEDED) {
        await this.paymentRepository.createEvent(
          {
            paymentId: input.payment.id,
            eventType: PaymentEventType.REFUND_PROCESSED,
            providerEventRef: input.providerRefundRef ?? null,
            actorType: AuditActorType.USER,
            actorUserId: currentRefund.actorUserId,
            source: currentRefund.source ?? SecurityAuditSource.HTTP_REQUEST,
            previousStatus: PaymentStatus.REFUND_PENDING,
            newStatus: PaymentStatus.REFUND_PENDING,
            payloadJson: {
              refundId: input.refundId,
              outcome: input.providerOutcome,
              ...input.providerPayload,
            },
          },
          tx,
        );
        await this.paymentRepository.createRefundEvent(
          {
            refundId: updated.id,
            paymentId: input.payment.id,
            sessionId: updated.sessionId,
            eventType: RefundEventType.SUCCEEDED,
            previousStatus: currentRefund.status,
            newStatus: RefundStatus.SUCCEEDED,
            destination: updated.destination,
            amount: updated.amount,
            currencyCode: updated.currencyCode,
            actorType: currentRefund.actorType,
            actorUserId: currentRefund.actorUserId,
            source: currentRefund.source,
            externalReference: input.providerRefundRef,
          },
          tx,
        );
      }

      const aggregate =
        await this.paymentRepository.sumSucceededRefundAmountByPaymentId(
          input.payment.id,
          tx,
        );
      const refunded = aggregate._sum.amount ?? new Prisma.Decimal(0);
      const isFullyRefunded = refunded.gte(input.payment.amountTotal);
      const targetStatus = isFullyRefunded
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

      this.validatePaymentStatusTransitionService.assertCanTransition(
        PaymentStatus.REFUND_PENDING,
        targetStatus,
      );

      await this.paymentRepository.updateStatus(
        input.payment.id,
        {
          status: targetStatus,
        },
        tx,
      );

      await this.postRefundLedgerEntriesUseCase.execute({
        refundId: updated.id,
        tx,
      });

      await this.sessionEarningReviewService.invalidatePendingReviewsForPayment(
        {
          paymentId: input.payment.id,
          internalReason: 'PAYMENT_REFUNDED_BEFORE_REVIEW_APPROVAL',
          tx,
        },
      );

      if (input.payment.sessionId) {
        if (isFullyRefunded) {
          await this.orchestrateSessionPaymentStatusService.markSessionRefunded(
            input.payment.sessionId,
            tx,
          );
        } else {
          await this.orchestrateSessionPaymentStatusService.markSessionRefundPending(
            input.payment.sessionId,
            tx,
          );
        }
      }

      return updated;
    });

    if (input.payment.patientId) {
      await this.operationalNotificationService.notifyRefundSucceeded({
        patientProfileId: input.payment.patientId,
        refundId: succeeded.id,
        amount: succeeded.amount.toString(),
        currencyCode: succeeded.currencyCode,
        financialEventType: 'REFUND_WALLET_CREDIT',
      });
    }

    return succeeded;
  }

  private async resolvePaymobTransactionRef(
    paymentId: string,
  ): Promise<string | null> {
    const event =
      await this.paymentRepository.findLatestProviderWebhookEventByPaymentId(
        paymentId,
      );

    if (!event?.payloadJson || typeof event.payloadJson !== 'object') {
      return null;
    }

    const payload = event.payloadJson as Record<string, unknown>;
    const transactionId = payload.id;

    if (
      typeof transactionId !== 'string' &&
      typeof transactionId !== 'number'
    ) {
      return null;
    }

    return String(transactionId);
  }
}
