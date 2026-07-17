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

    const breakdown = this.extractPaymentLedgerBreakdownService.extract(
      refund.payment,
    );
    const paymentTotal = this.moneyAmountService.toDecimal(
      refund.payment.amountTotal,
    );
    const refundAmount = this.moneyAmountService.toDecimal(refund.amount);
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
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${refund.id})::bigint)`;

      const existing = await this.ledgerRepository.findByRefundId(
        refund.id,
        tx,
      );
      const wasAlreadyPosted = existing.length > 0;

      if (!wasAlreadyPosted) {
        const approvedReview = refund.payment.practitionerId
          ? await tx.sessionEarningReview.findFirst({
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
              },
              orderBy: [{ approvedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            })
          : null;
        const currentBalance =
          refund.payment.practitionerId && approvedReview
            ? await this.balanceService.getBalance({
                practitionerId: refund.payment.practitionerId,
                currencyCode: refund.currencyCode,
                tx,
              })
            : null;
        const currentPayableAmount = currentBalance
          ? new Prisma.Decimal(currentBalance.totalPayableAmount)
          : new Prisma.Decimal(0);
        const absorbablePractitionerRefundAmount =
          currentBalance && currentPayableAmount.lt(practitionerRefundAmount)
            ? currentPayableAmount
            : practitionerRefundAmount;
        const practitionerRecoveryShortfall = practitionerRefundAmount.sub(
          absorbablePractitionerRefundAmount,
        );

        const refundLedgerEntries = [
          {
            practitionerId: refund.payment.practitionerId,
            sessionId: refund.payment.sessionId,
            paymentId: refund.payment.id,
            entryType: LedgerEntryType.REFUND_PRACTITIONER_REVERSAL,
            direction: LedgerDirection.DEBIT,
            amount: absorbablePractitionerRefundAmount,
            currencyCode: refund.currencyCode,
            balanceBucket: WalletBalanceBucket.AVAILABLE,
            referenceType: 'refund',
            referenceId: refund.id,
            description: 'Practitioner earnings reversal from refund.',
            metadataJson: {
              source: 'refund-succeeded',
              refundId: refund.id,
              paymentId: refund.payment.id,
            },
          },
          {
            practitionerId: null,
            sessionId: refund.payment.sessionId,
            paymentId: refund.payment.id,
            entryType: LedgerEntryType.REFUND_PLATFORM_REVERSAL,
            direction: LedgerDirection.DEBIT,
            amount: platformRefundAmount,
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
            practitionerId: refund.payment.practitionerId ?? approvedReview.practitionerId,
            refundId: refund.id,
            paymentId: refund.payment.id,
            sessionId: approvedReview.sessionId ?? refund.payment.sessionId,
            sessionEarningReviewId: approvedReview.id,
            amount: practitionerRecoveryShortfall,
            currencyCode: refund.currencyCode,
            reasonCode,
            internalReason: 'REFUND_REQUIRES_PRACTITIONER_RECOVERY',
            practitionerFacingNote: null,
            tx,
          });
        }
      }

      if (refund.payment.practitionerId) {
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
        tx,
      });

      return {
        items: await this.ledgerRepository.findByRefundId(refund.id, tx),
        wasAlreadyPosted,
      };
    });

    return result;
  }
}
