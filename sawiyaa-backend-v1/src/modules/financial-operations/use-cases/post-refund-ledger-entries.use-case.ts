import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  RefundStatus,
  Prisma,
  SessionEarningReviewStatus,
  WalletBalanceBucket,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { LedgerRepository } from '../repositories/ledger.repository';
import { PractitionerRecoveryReasonCode } from '@prisma/client';
import { ExtractPaymentLedgerBreakdownService } from '../services/extract-payment-ledger-breakdown.service';
import { MoneyAmountService } from '../services/money-amount.service';
import { PractitionerRecoveryService } from '../services/practitioner-recovery.service';
import { PractitionerManualPayoutBalanceService } from '../services/practitioner-manual-payout-balance.service';
import { RefreshPractitionerWalletService } from '../services/refresh-practitioner-wallet.service';
import { AccountingJournalPostingService } from '../services/accounting-journal-posting.service';
import { lockPractitionerFinance } from '../utils/lock-practitioner-finance';

@Injectable()
export class PostRefundLedgerEntriesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialOperationsPaymentRepository: FinancialOperationsPaymentRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly extractPaymentLedgerBreakdownService: ExtractPaymentLedgerBreakdownService,
    private readonly balanceService: PractitionerManualPayoutBalanceService,
    private readonly practitionerRecoveryService: PractitionerRecoveryService,
    private readonly refreshPractitionerWalletService: RefreshPractitionerWalletService,
    private readonly moneyAmountService: MoneyAmountService,
    private readonly accountingJournalPostingService: AccountingJournalPostingService,
  ) {}

  private async withTx<T>(
    tx: Prisma.TransactionClient | undefined,
    run: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (tx) {
      return run(tx);
    }

    return this.prisma.$transaction(async (transaction) => run(transaction));
  }

  async execute(input: { refundId: string; tx?: Prisma.TransactionClient }) {
    const refund =
      await this.financialOperationsPaymentRepository.findRefundForPosting(
        input.refundId,
        input.tx,
      );

    if (!refund || !refund.payment) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.refundNotFound',
        error: 'FINANCIAL_OPERATIONS_REFUND_NOT_FOUND',
      });
    }

    if (refund.status !== RefundStatus.SUCCEEDED) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.refundNotSucceeded',
        error: 'FINANCIAL_OPERATIONS_REFUND_NOT_SUCCEEDED',
      });
    }

    const paymentMetadata = (refund.payment.metadataJson ?? {}) as Record<
      string,
      unknown
    >;
    const breakdown =
      refund.payment.commissionPlatformRatePercent != null ||
      paymentMetadata.financialBreakdown
        ? this.extractPaymentLedgerBreakdownService.extract(refund.payment)
        : {
            practitionerShareAmount: '0.00',
            platformCommissionAmount: refund.payment.amountTotal.toFixed(2),
          };
    const paymentTotal = this.moneyAmountService.toDecimal(
      refund.payment.amountTotal,
    );
    const refundAmount = this.moneyAmountService.toDecimal(refund.amount);
    const refundMetadata = (refund.metadataJson ?? {}) as Record<
      string,
      unknown
    >;
    const isPackagePolicyRefund = refundMetadata.packageRefundPolicy === true;
    if (
      !paymentTotal.isFinite() ||
      paymentTotal.lte(0) ||
      (!isPackagePolicyRefund && refundAmount.lte(0)) ||
      (isPackagePolicyRefund && refundAmount.lt(0)) ||
      refundAmount.gt(paymentTotal) ||
      refund.currencyCode !== refund.payment.currencyCode
    ) {
      throw new BadRequestException({
        error: 'FINANCIAL_OPERATIONS_REFUND_SNAPSHOT_INVALID',
      });
    }
    const ratio = refundAmount.div(paymentTotal);
    const practitionerRefundAmount = this.moneyAmountService
      .toDecimal(breakdown.practitionerShareAmount)
      .mul(ratio)
      .toDecimalPlaces(2);
    const platformRefundAmount = this.moneyAmountService
      .toDecimal(refundAmount)
      .sub(practitionerRefundAmount)
      .toDecimalPlaces(2);

    const result = await this.withTx(input.tx, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${refund.payment.id})::bigint)`;
      if (refund.payment.practitionerId)
        await lockPractitionerFinance(tx, refund.payment.practitionerId);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${refund.id})::bigint)`;

      const existing = await this.ledgerRepository.findByRefundId(
        refund.id,
        tx,
      );
      const wasAlreadyPosted = existing.length > 0;
      const currentRefund = await tx.refund.findUniqueOrThrow({
        where: { id: refund.id },
        select: { metadataJson: true },
      });
      const currentRefundMetadata = (currentRefund.metadataJson ?? {}) as Record<
        string,
        unknown
      >;
      if (
        wasAlreadyPosted ||
        currentRefundMetadata.financialReversalVersion === 2
      ) {
        return { items: existing, wasAlreadyPosted: true };
      }
      let journalRecognition = {
        allocatedRefundAmount: '0.00',
        practitionerSourceRefundAmount: '0.00',
        platformRefundAmount: '0.00',
        walletCurrency: refund.currencyCode,
        walletRefundAmount: '0.00',
        availableDebit: '0.00',
        recoveryAmount: '0.00',
      };

      if (!wasAlreadyPosted) {
        // Package-policy refunds return only the unused package economics. Any
        // approved earning for a completed package Session is legitimate and
        // must remain untouched; the deferred package balance absorbs the
        // refund instead of creating practitioner reversals/recoveries.
        const approvedReviews = isPackagePolicyRefund
          ? []
          : refund.payment.practitionerId
          ? await tx.sessionEarningReview.findMany({
              where: {
                paymentId: refund.payment.id,
                practitionerId: refund.payment.practitionerId,
                reviewStatus: SessionEarningReviewStatus.APPROVED,
              },
              select: {
                id: true,
                sessionId: true,
                paymentId: true,
                practitionerId: true,
                approvedAt: true,
                paymentAmount: true,
                accountantApprovedSourceAmount: true,
                settlementId: true,
                ledgerEntries: {
                  where: {
                    entryType: LedgerEntryType.PRACTITIONER_EARNING,
                    direction: LedgerDirection.CREDIT,
                  },
                  select: {
                    amount: true,
                    currencyCode: true,
                    settlementId: true,
                  },
                },
              },
              orderBy: [
                { approvedAt: 'desc' },
                { createdAt: 'desc' },
                { id: 'desc' },
              ],
            })
          : [];
        const currencies = new Set(
          approvedReviews.flatMap((review) =>
            review.ledgerEntries.map((entry) => entry.currencyCode),
          ),
        );
        if (currencies.size > 1)
          throw new BadRequestException({
            error: 'REFUND_REQUIRES_MULTI_CURRENCY_RECOVERY_REVIEW',
          });
        const approvedReview = approvedReviews.length
          ? {
              ...approvedReviews[0],
              paymentAmount: approvedReviews.reduce(
                (sum, review) => sum.add(review.paymentAmount),
                new Prisma.Decimal(0),
              ),
              accountantApprovedSourceAmount: approvedReviews.reduce(
                (sum, review) =>
                  sum.add(review.accountantApprovedSourceAmount ?? 0),
                new Prisma.Decimal(0),
              ),
            }
          : null;
        const individualEarnings = approvedReviews.flatMap(
          (review) => review.ledgerEntries,
        );
        const earning = individualEarnings.length
          ? {
              amount: individualEarnings.reduce(
                (sum, entry) => sum.add(entry.amount),
                new Prisma.Decimal(0),
              ),
              currencyCode: individualEarnings[0].currencyCode,
              settlementId:
                individualEarnings.length === 1
                  ? individualEarnings[0].settlementId
                  : null,
            }
          : null;
        const reversalCurrency = earning?.currencyCode ?? refund.currencyCode;
        for (const review of approvedReviews) {
          const credited = review.ledgerEntries[0];
          await this.accountingJournalPostingService.postSessionEarningRecognized(
            {
              reviewId: review.id,
              paymentId: refund.payment.id,
              practitionerId: review.practitionerId,
              allocatedAmount: review.paymentAmount,
              practitionerSourceAmount:
                review.accountantApprovedSourceAmount ?? new Prisma.Decimal(0),
              sourceCurrency: refund.currencyCode,
              walletCurrency: credited?.currencyCode ?? refund.currencyCode,
              walletCredit: credited?.amount ?? new Prisma.Decimal(0),
              occurredAt: review.approvedAt ?? new Date(),
              tx,
            },
          );
        }
        const prior = await tx.refund.aggregate({
          where: {
            paymentId: refund.payment.id,
            status: RefundStatus.SUCCEEDED,
            id: { not: refund.id },
          },
          _sum: { amount: true },
        });
        const priorAmount = prior._sum.amount ?? new Prisma.Decimal(0);
        const cumulative = priorAmount.add(refundAmount);
        if (cumulative.gt(paymentTotal))
          throw new BadRequestException({
            error: 'PAYMENT_REFUND_AMOUNT_EXCEEDS_REMAINING',
          });
        const recognizedRefund = individualEarnings.reduce(
          (sum, entry) =>
            sum.add(
              entry.amount
                .mul(cumulative)
                .div(paymentTotal)
                .toDecimalPlaces(2)
                .sub(
                  entry.amount
                    .mul(priorAmount)
                    .div(paymentTotal)
                    .toDecimalPlaces(2),
                ),
            ),
          new Prisma.Decimal(0),
        );
        const approvedSource =
          approvedReview?.accountantApprovedSourceAmount ??
          new Prisma.Decimal(0);
        const sourcePractitionerReversal = approvedSource
          .mul(cumulative)
          .div(paymentTotal)
          .toDecimalPlaces(2)
          .sub(
            approvedSource
              .mul(priorAmount)
              .div(paymentTotal)
              .toDecimalPlaces(2),
          );
        const allocatedSource =
          approvedReview?.paymentAmount ?? new Prisma.Decimal(0);
        const allocatedReversal = allocatedSource
          .mul(cumulative)
          .div(paymentTotal)
          .toDecimalPlaces(2)
          .sub(
            allocatedSource
              .mul(priorAmount)
              .div(paymentTotal)
              .toDecimalPlaces(2),
          );
        const sourcePlatformReversal = allocatedReversal.sub(
          sourcePractitionerReversal,
        );
        const currentBalance =
          refund.payment.practitionerId && approvedReview
            ? await this.balanceService.getBalance({
                practitionerId: refund.payment.practitionerId,
                currencyCode: reversalCurrency,
                tx,
              })
            : null;
        const currentPayableAmount = currentBalance
          ? new Prisma.Decimal(currentBalance.totalPayableAmount)
          : new Prisma.Decimal(0);
        const absorbablePractitionerRefundAmount = !earning
          ? new Prisma.Decimal(0)
          : Prisma.Decimal.max(
              0,
              Prisma.Decimal.min(currentPayableAmount, recognizedRefund),
            );
        const practitionerRecoveryShortfall = recognizedRefund.sub(
          absorbablePractitionerRefundAmount,
        );
        journalRecognition = {
          allocatedRefundAmount: allocatedReversal.toFixed(2),
          practitionerSourceRefundAmount: sourcePractitionerReversal.toFixed(2),
          platformRefundAmount: sourcePlatformReversal.toFixed(2),
          walletCurrency: reversalCurrency,
          walletRefundAmount: recognizedRefund.toFixed(2),
          availableDebit: absorbablePractitionerRefundAmount.toFixed(2),
          recoveryAmount: practitionerRecoveryShortfall.toFixed(2),
        };

        let remainingAbsorbable = absorbablePractitionerRefundAmount;
        const practitionerEntries = approvedReviews.flatMap((review) => {
          const credited = review.ledgerEntries[0];
          if (!credited) return [];
          const entitled = credited.amount
            .mul(cumulative)
            .div(paymentTotal)
            .toDecimalPlaces(2)
            .sub(
              credited.amount
                .mul(priorAmount)
                .div(paymentTotal)
                .toDecimalPlaces(2),
            );
          const debit = Prisma.Decimal.min(remainingAbsorbable, entitled);
          remainingAbsorbable = remainingAbsorbable.sub(debit);
          return debit.gt(0)
            ? [
                {
                  practitionerId: review.practitionerId,
                  sessionId: review.sessionId,
                  paymentId: refund.payment.id,
                  settlementId: credited.settlementId,
                  sessionEarningReviewId: review.id,
                  entryType: LedgerEntryType.REFUND_PRACTITIONER_REVERSAL,
                  direction: LedgerDirection.DEBIT,
                  amount: debit,
                  currencyCode: reversalCurrency,
                  balanceBucket: WalletBalanceBucket.AVAILABLE,
                  referenceType: 'refund',
                  referenceId: refund.id,
                  description:
                    'Approved practitioner earning reversed by refund.',
                  metadataJson: {
                    source: 'refund-succeeded',
                    refundId: refund.id,
                    paymentId: refund.payment.id,
                  },
                },
              ]
            : [];
        });
        const refundLedgerEntries = [
          ...practitionerEntries,
          {
            practitionerId: null,
            sessionId: refund.payment.sessionId,
            paymentId: refund.payment.id,
            entryType: LedgerEntryType.REFUND_PLATFORM_REVERSAL,
            direction: LedgerDirection.DEBIT,
            amount: approvedReview
              ? sourcePlatformReversal
              : new Prisma.Decimal(0),
            currencyCode: refund.currencyCode,
            balanceBucket: WalletBalanceBucket.AVAILABLE,
            referenceType: 'refund',
            referenceId: refund.id,
            description: 'Platform commission reversal from refund.',
            metadataJson: {
              source: 'refund-succeeded',
              refundId: refund.id,
              paymentId: refund.payment.id,
            },
          },
        ].filter((entry) => entry.amount.gt(0));

        if (refundLedgerEntries.length > 0) {
          await this.ledgerRepository.createManyLedgerEntries(
            refundLedgerEntries,
            tx,
          );
        }
        if (practitionerRecoveryShortfall.gt(0) && approvedReview) {
          const reasonCode =
            currentBalance && currentBalance.lastPayoutAt
              ? PractitionerRecoveryReasonCode.REFUND_AFTER_PAYOUT
              : PractitionerRecoveryReasonCode.REFUND_AFTER_APPROVAL;

          await this.practitionerRecoveryService.createRecoveryForRefund({
            practitionerId:
              refund.payment.practitionerId ?? approvedReview.practitionerId,
            refundId: refund.id,
            paymentId: refund.payment.id,
            sessionId: approvedReview.sessionId ?? refund.payment.sessionId,
            sessionEarningReviewId:
              approvedReviews.length === 1 ? approvedReview.id : null,
            amount: practitionerRecoveryShortfall,
            currencyCode: reversalCurrency,
            reasonCode,
            internalReason: 'REFUND_REQUIRES_PRACTITIONER_RECOVERY',
            practitionerFacingNote: null,
            tx,
          });
        }
      }

      if (
        refund.payment.practitionerId &&
        (await tx.practitionerWallet.findFirst({
          where: {
            practitionerId: refund.payment.practitionerId,
            status: 'ACTIVE',
          },
          select: { id: true },
        }))
      ) {
        await this.refreshPractitionerWalletService.refresh(
          refund.payment.practitionerId,
          tx,
        );
      }

      await this.accountingJournalPostingService.postRefundSucceeded({
        refund: {
          id: refund.id,
          paymentId: refund.payment.id,
          practitionerId: refund.payment.practitionerId,
          amount: refund.amount,
          currencyCode: refund.currencyCode,
          processedAt: refund.processedAt,
          destination: refund.destination,
          metadataJson: refund.metadataJson ?? null,
        },
        split: {
          practitionerRefundAmount: practitionerRefundAmount.toFixed(2),
          platformRefundAmount: platformRefundAmount.toFixed(2),
        },
        recognition: journalRecognition,
        tx,
      });

      await tx.refund.update({
        where: { id: refund.id },
        data: {
          metadataJson: {
            ...currentRefundMetadata,
            financialReversalVersion: 2,
            financialReversal: journalRecognition,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        items: await this.ledgerRepository.findByRefundId(refund.id, tx),
        wasAlreadyPosted,
      };
    });

    return result;
  }
}
