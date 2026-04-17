import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  RefundStatus,
  WalletBalanceBucket,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { LedgerRepository } from '../repositories/ledger.repository';
import { ExtractPaymentLedgerBreakdownService } from '../services/extract-payment-ledger-breakdown.service';
import { MoneyAmountService } from '../services/money-amount.service';
import { RefreshPractitionerWalletService } from '../services/refresh-practitioner-wallet.service';

@Injectable()
export class PostRefundLedgerEntriesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialOperationsPaymentRepository: FinancialOperationsPaymentRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly extractPaymentLedgerBreakdownService: ExtractPaymentLedgerBreakdownService,
    private readonly refreshPractitionerWalletService: RefreshPractitionerWalletService,
    private readonly moneyAmountService: MoneyAmountService,
  ) {}

  async execute(input: { refundId: string }) {
    const refund =
      await this.financialOperationsPaymentRepository.findRefundForPosting(
        input.refundId,
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

    const existing = await this.ledgerRepository.findByRefundId(refund.id);
    if (existing.length > 0) {
      return {
        items: existing,
        wasAlreadyPosted: true,
      };
    }

    const breakdown = this.extractPaymentLedgerBreakdownService.extract(refund.payment);
    const paymentTotal = this.moneyAmountService.toDecimal(refund.payment.amountTotal);
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

    await this.prisma.$transaction(async (tx) => {
      await this.ledgerRepository.createManyLedgerEntries(
        [
          {
            practitionerId: refund.payment.practitionerId,
            sessionId: refund.payment.sessionId,
            paymentId: refund.payment.id,
            entryType: LedgerEntryType.REFUND_PRACTITIONER_REVERSAL,
            direction: LedgerDirection.DEBIT,
            amount: practitionerRefundAmount.toFixed(2),
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
            amount: platformRefundAmount.toFixed(2),
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
        ],
        tx,
      );

      if (refund.payment.practitionerId) {
        await this.refreshPractitionerWalletService.refresh(
          refund.payment.practitionerId,
          tx,
        );
      }
    });

    return {
      items: await this.ledgerRepository.findByRefundId(refund.id),
      wasAlreadyPosted: false,
    };
  }
}
