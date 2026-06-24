import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
  RefundDestination,
  RefundStatus,
  SessionCancellationRefundMode,
} from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionRepository } from '../repositories/session.repository';
import { EvaluateSessionCancellationPolicyService } from '../services/evaluate-session-cancellation-policy.service';

@Injectable()
export class PreviewSessionCancellationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly evaluateSessionCancellationPolicyService: EvaluateSessionCancellationPolicyService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    sessionId: string;
  }) {
    const patient = await this.sessionPatientRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.patientNotFound',
        error: 'SESSION_PATIENT_NOT_FOUND',
      });
    }

    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session || session.patient.id !== patient.id) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }

    const evaluation =
      await this.evaluateSessionCancellationPolicyService.evaluate({
        session,
      });

    const payment = await this.prisma.payment.findFirst({
      where: { sessionId: session.id },
      orderBy: [{ createdAt: 'desc' }],
    });

    const zero = new Prisma.Decimal(0);
    const paymentAmountTotal = payment?.amountTotal ?? zero;
    const paymentAmountFromWallet = payment?.amountFromWallet ?? zero;
    const paymentAmountFromGateway = payment?.amountFromGateway ?? zero;

    let alreadyRefundedAmount = zero;
    if (payment) {
      const aggregate = await this.prisma.refund.aggregate({
        where: {
          paymentId: payment.id,
          status: RefundStatus.SUCCEEDED,
        },
        _sum: { amount: true },
      });
      alreadyRefundedAmount = aggregate._sum.amount ?? zero;
    }

    let reservationReleaseAmount = zero;
    let refundAmount = zero;
    let walletCreditAmount = zero;
    const gatewayRefundAmount = zero;
    let outcomeType:
      | 'NO_PAYMENT'
      | 'POLICY_BLOCKED'
      | 'RESERVATION_RELEASE'
      | 'REFUND_TO_WALLET'
      | 'NO_REFUND'
      | 'UNSUPPORTED_REFUND_DESTINATION'
      | 'PAYMENT_STATE_NOT_REFUNDABLE' = 'NO_REFUND';
    let blockingReasonCode: string | null = null;
    let canCancelNow = evaluation.cancellationAllowed;

    if (!evaluation.cancellationAllowed) {
      outcomeType = 'POLICY_BLOCKED';
      blockingReasonCode = 'SESSION_CANCELLATION_NOT_ALLOWED_BY_POLICY';
      canCancelNow = false;
    } else if (!payment) {
      outcomeType = 'NO_PAYMENT';
    } else {
      const isReservationOnlyPayment =
        payment.status === PaymentStatus.CREATED ||
        payment.status === PaymentStatus.PENDING ||
        payment.status === PaymentStatus.REQUIRES_ACTION ||
        payment.status === PaymentStatus.AUTHORIZED;

      if (isReservationOnlyPayment) {
        reservationReleaseAmount = paymentAmountFromWallet;
        outcomeType = reservationReleaseAmount.gt(0)
          ? 'RESERVATION_RELEASE'
          : 'NO_REFUND';
      } else {
        const isRefundEligiblePayment =
          payment.status === PaymentStatus.CAPTURED ||
          payment.status === PaymentStatus.PARTIALLY_REFUNDED ||
          payment.status === PaymentStatus.REFUND_PENDING;

        if (!isRefundEligiblePayment) {
          outcomeType = 'PAYMENT_STATE_NOT_REFUNDABLE';
        } else {
          refundAmount = this.resolveRefundAmount({
            paymentAmountTotal,
            refundMode: evaluation.refundMode,
            refundPercent: evaluation.refundPercent,
            alreadyRefundedAmount,
          });

          if (refundAmount.lte(0)) {
            outcomeType = 'NO_REFUND';
          } else if (
            evaluation.refundDestination !== RefundDestination.CUSTOMER_WALLET
          ) {
            // Current cancellation financial implementation is wallet-only.
            outcomeType = 'UNSUPPORTED_REFUND_DESTINATION';
            blockingReasonCode =
              'SESSION_CANCELLATION_REFUND_DESTINATION_NOT_SUPPORTED';
            canCancelNow = false;
          } else {
            walletCreditAmount = refundAmount;
            outcomeType = 'REFUND_TO_WALLET';
          }
        }
      }
    }

    return {
      item: {
        sessionId: session.id,
        bookingType: evaluation.bookingType,
        canCancelNow,
        cancellationAllowedByPolicy: evaluation.cancellationAllowed,
        blockingReasonCode,
        sessionStartAt: session.scheduledStartAt?.toISOString() ?? '',
        hoursBeforeStart: Number(evaluation.hoursBeforeStart.toFixed(2)),
        matchedRuleCode: evaluation.ruleCode,
        matchedRuleDisplayName: evaluation.ruleDisplayName,
        refundMode: evaluation.refundMode,
        refundPercent: evaluation.refundPercent,
        refundDestination: evaluation.refundDestination,
        paymentStatus: payment?.status ?? null,
        paymentAmountTotal: paymentAmountTotal.toFixed(2),
        paymentAmountFromWallet: paymentAmountFromWallet.toFixed(2),
        paymentAmountFromGateway: paymentAmountFromGateway.toFixed(2),
        alreadyRefundedAmount: alreadyRefundedAmount.toFixed(2),
        reservationReleaseAmount: reservationReleaseAmount.toFixed(2),
        refundAmount: refundAmount.toFixed(2),
        walletCreditAmount: walletCreditAmount.toFixed(2),
        gatewayRefundAmount: gatewayRefundAmount.toFixed(2),
        outcomeType,
      },
    };
  }

  private resolveRefundAmount(input: {
    paymentAmountTotal: Prisma.Decimal;
    refundMode: SessionCancellationRefundMode;
    refundPercent: string | null;
    alreadyRefundedAmount: Prisma.Decimal;
  }): Prisma.Decimal {
    if (input.refundMode === SessionCancellationRefundMode.NONE) {
      return new Prisma.Decimal(0);
    }

    const percent = new Prisma.Decimal(input.refundPercent ?? '0');
    if (percent.lte(0)) {
      return new Prisma.Decimal(0);
    }

    const targetByPolicy = input.paymentAmountTotal
      .mul(percent)
      .div(100)
      .toDecimalPlaces(2);
    const due = targetByPolicy
      .sub(input.alreadyRefundedAmount)
      .toDecimalPlaces(2);
    return due.gt(0) ? due : new Prisma.Decimal(0);
  }
}
