import { BadRequestException, Injectable } from '@nestjs/common';
import {
  JournalEntrySourceType,
  JournalEntryStatus,
  LedgerDirection,
  Prisma,
  RefundDestination,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { MoneyAmountService } from './money-amount.service';
import { AccountingLedgerAccountService } from './accounting-ledger-account.service';

type TransferFeeTreatment = 'PLATFORM_EXPENSE' | 'DEDUCT_FROM_PRACTITIONER';

type JournalLineDraft = {
  ledgerAccountId: string;
  direction: LedgerDirection;
  amount: string;
  memo: string;
  referenceType: string;
  referenceId: string;
  metadataJson?: Prisma.InputJsonValue;
};

@Injectable()
export class AccountingJournalPostingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moneyAmountService: MoneyAmountService,
    private readonly accountingLedgerAccountService: AccountingLedgerAccountService,
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

  async postPaymentCaptured(input: {
    payment: {
      id: string;
      practitionerId: string | null;
      currencyCode: string;
      amountFromGateway: Prisma.Decimal;
      amountFromWallet: Prisma.Decimal;
      amountTotal: Prisma.Decimal;
      commissionRuleId: string | null;
      commissionPlatformRatePercent: Prisma.Decimal | null;
      commissionPractitionerRatePercent: Prisma.Decimal | null;
      vatRatePercentSnapshot: Prisma.Decimal | null;
      vatAmountSnapshot: Prisma.Decimal | null;
      gatewayFeeRatePercentSnapshot: Prisma.Decimal | null;
      gatewayFeeFixedAmountSnapshot: Prisma.Decimal | null;
      gatewayFeeAmountSnapshot: Prisma.Decimal | null;
      metadataJson: Prisma.JsonValue | null;
      capturedAt: Date | null;
    };
    breakdown: {
      practitionerShareAmount: string;
      platformCommissionAmount: string;
      currencyCode: string;
    };
    tx?: Prisma.TransactionClient;
  }) {
    return this.withTx(input.tx, async (tx) => {
      const existing = await tx.journalEntry.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
            sourceId: input.payment.id,
          },
        },
        include: { lines: true },
      });
      if (existing) {
        return { journalEntry: existing, wasAlreadyPosted: true };
      }

      const platformAccounts =
        await this.accountingLedgerAccountService.ensurePlatformAccounts(
          input.payment.currencyCode,
          tx,
        );
      const practitionerPayableAccountId = input.payment.practitionerId
        ? await this.accountingLedgerAccountService.ensurePractitionerPayableAccount(
            {
              practitionerId: input.payment.practitionerId,
              currencyCode: input.payment.currencyCode,
              tx,
            },
          )
        : null;

      const practitionerShare = this.toMoney(input.breakdown.practitionerShareAmount);
      const platformCommission = this.toMoney(
        input.breakdown.platformCommissionAmount,
      );
      const amountFromGateway = this.toMoney(input.payment.amountFromGateway);
      const amountFromWallet = this.toMoney(input.payment.amountFromWallet);
      const totalAmount = this.toMoney(input.payment.amountTotal);
      const gatewayFees = input.payment.gatewayFeeAmountSnapshot
        ? this.toMoney(input.payment.gatewayFeeAmountSnapshot)
        : this.readMoneyFromMetadata(input.payment.metadataJson, 'gatewayFeeAmount');
      const vatAmount = input.payment.vatAmountSnapshot
        ? this.toMoney(input.payment.vatAmountSnapshot)
        : this.readMoneyFromMetadata(input.payment.metadataJson, 'vatAmount');
      const vatRatePercent = input.payment.vatRatePercentSnapshot
        ? this.toMoney(input.payment.vatRatePercentSnapshot)
        : this.readMoneyFromMetadata(input.payment.metadataJson, 'vatRatePercent');
      const gatewayFeeRatePercent = input.payment.gatewayFeeRatePercentSnapshot
        ? this.toMoney(input.payment.gatewayFeeRatePercentSnapshot)
        : this.readMoneyFromMetadata(
            input.payment.metadataJson,
            'gatewayFeeRatePercent',
          );
      const gatewayFeeFixedAmount =
        input.payment.gatewayFeeFixedAmountSnapshot
          ? this.toMoney(input.payment.gatewayFeeFixedAmountSnapshot)
          : this.readMoneyFromMetadata(
              input.payment.metadataJson,
              'gatewayFeeFixedAmount',
            );

      const lines: JournalLineDraft[] = [
        {
          ledgerAccountId: platformAccounts.gatewayClearingAccountId,
          direction: LedgerDirection.DEBIT,
          amount: amountFromGateway.toFixed(2),
          memo: 'Increase gateway clearing for captured online payment funds.',
          referenceType: 'payment',
          referenceId: input.payment.id,
        },
      ];

      if (practitionerPayableAccountId) {
        lines.push(
          {
            ledgerAccountId: platformAccounts.platformRevenueAccountId,
            direction: LedgerDirection.CREDIT,
            amount: platformCommission.toFixed(2),
            memo: 'Recognize platform commission on captured payment.',
            referenceType: 'payment',
            referenceId: input.payment.id,
          },
          {
            ledgerAccountId: practitionerPayableAccountId,
            direction: LedgerDirection.CREDIT,
            amount: practitionerShare.toFixed(2),
            memo: 'Recognize practitioner payable on captured payment.',
            referenceType: 'payment',
            referenceId: input.payment.id,
          },
        );
      } else {
        lines.push({
          ledgerAccountId: platformAccounts.platformRevenueAccountId,
          direction: LedgerDirection.CREDIT,
          amount: totalAmount.toFixed(2),
          memo: 'Recognize platform revenue for platform-owned captured payment.',
          referenceType: 'payment',
          referenceId: input.payment.id,
        });
      }

      if (amountFromWallet.gt(0)) {
        lines.push({
          ledgerAccountId: platformAccounts.customerWalletLiabilityAccountId,
          direction: LedgerDirection.DEBIT,
          amount: amountFromWallet.toFixed(2),
          memo: 'Reduce customer wallet liability for wallet-funded payment share.',
          referenceType: 'payment',
          referenceId: input.payment.id,
        });
      }

      if (gatewayFees.gt(0)) {
        lines.push({
          ledgerAccountId: platformAccounts.gatewayFeesExpenseAccountId,
          direction: LedgerDirection.DEBIT,
          amount: gatewayFees.toFixed(2),
          memo: 'Recognize gateway fee expense for captured payment.',
          referenceType: 'payment',
          referenceId: input.payment.id,
        });
        lines.push({
          ledgerAccountId: platformAccounts.gatewayClearingAccountId,
          direction: LedgerDirection.CREDIT,
          amount: gatewayFees.toFixed(2),
          memo: 'Reduce gateway clearing by captured gateway fee.',
          referenceType: 'payment',
          referenceId: input.payment.id,
        });
      }

      if (vatAmount.gt(0)) {
        lines.push({
          ledgerAccountId: platformAccounts.vatPayableAccountId,
          direction: LedgerDirection.CREDIT,
          amount: vatAmount.toFixed(2),
          memo: 'Recognize VAT payable at payment capture.',
          referenceType: 'payment',
          referenceId: input.payment.id,
        });
        lines.push({
          ledgerAccountId: platformAccounts.platformRevenueAccountId,
          direction: LedgerDirection.DEBIT,
          amount: vatAmount.toFixed(2),
          memo: 'Reclassify VAT portion from gross platform revenue.',
          referenceType: 'payment',
          referenceId: input.payment.id,
        });
      }

      this.assertBalanced(lines);

      const journalEntry = await tx.journalEntry.create({
        data: {
          sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
          sourceId: input.payment.id,
          occurredAt: input.payment.capturedAt ?? new Date(),
          currencyCode: input.payment.currencyCode,
          status: JournalEntryStatus.POSTED,
          description: 'Payment captured accounting posting.',
          metadataJson: {
            postingVersion: 1,
            source: 'payment-captured',
            amountTotal: totalAmount.toFixed(2),
            amountFromGateway: amountFromGateway.toFixed(2),
            amountFromWallet: amountFromWallet.toFixed(2),
            practitionerShareAmount: practitionerShare.toFixed(2),
            platformCommissionAmount: platformCommission.toFixed(2),
            gatewayFeeAmount: gatewayFees.toFixed(2),
            gatewayFeeRatePercent: gatewayFeeRatePercent.toFixed(2),
            gatewayFeeFixedAmount: gatewayFeeFixedAmount.toFixed(2),
            vatAmount: vatAmount.toFixed(2),
            vatRatePercent: vatRatePercent.toFixed(2),
            commissionSnapshot: {
              commissionRuleId: input.payment.commissionRuleId,
              platformRatePercent:
                input.payment.commissionPlatformRatePercent?.toString() ?? null,
              practitionerRatePercent:
                input.payment.commissionPractitionerRatePercent?.toString() ?? null,
            },
          },
        },
      });

      await tx.journalLine.createMany({
        data: lines.map((line) => ({
          journalEntryId: journalEntry.id,
          ...line,
        })),
      });

      const hydrated = await tx.journalEntry.findUniqueOrThrow({
        where: { id: journalEntry.id },
        include: { lines: true },
      });

      return {
        journalEntry: hydrated,
        wasAlreadyPosted: false,
      };
    });
  }

  async postRefundSucceeded(input: {
    refund: {
      id: string;
      paymentId: string;
      practitionerId: string | null;
      amount: Prisma.Decimal;
      currencyCode: string;
      processedAt: Date | null;
      destination: RefundDestination;
      metadataJson?: Prisma.JsonValue | null;
    };
    split: {
      practitionerRefundAmount: string;
      platformRefundAmount: string;
    };
    tx?: Prisma.TransactionClient;
  }) {
    return this.withTx(input.tx, async (tx) => {
      const existing = await tx.journalEntry.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
            sourceId: input.refund.id,
          },
        },
        include: { lines: true },
      });
      if (existing) {
        return { journalEntry: existing, wasAlreadyPosted: true };
      }

      const platformAccounts =
        await this.accountingLedgerAccountService.ensurePlatformAccounts(
          input.refund.currencyCode,
          tx,
        );
      const practitionerPayableAccountId = input.refund.practitionerId
        ? await this.accountingLedgerAccountService.ensurePractitionerPayableAccount(
            {
              practitionerId: input.refund.practitionerId,
              currencyCode: input.refund.currencyCode,
              tx,
            },
          )
        : null;

      const practitionerRefundAmount = this.toMoney(
        input.split.practitionerRefundAmount,
      );
      const platformRefundAmount = this.toMoney(input.split.platformRefundAmount);
      const totalRefundAmount = this.toMoney(input.refund.amount);

      const lines: JournalLineDraft[] = [];
      if (practitionerPayableAccountId) {
        lines.push({
          ledgerAccountId: practitionerPayableAccountId,
          direction: LedgerDirection.DEBIT,
          amount: practitionerRefundAmount.toFixed(2),
          memo: 'Reverse practitioner payable for successful refund.',
          referenceType: 'refund',
          referenceId: input.refund.id,
        });
      }
      lines.push({
        ledgerAccountId: platformAccounts.platformRevenueAccountId,
        direction: LedgerDirection.DEBIT,
        amount: platformRefundAmount.toFixed(2),
        memo: 'Reverse platform commission for successful refund.',
        referenceType: 'refund',
        referenceId: input.refund.id,
      });

      if (input.refund.destination === RefundDestination.CUSTOMER_WALLET) {
        lines.push({
          ledgerAccountId: platformAccounts.customerWalletLiabilityAccountId,
          direction: LedgerDirection.CREDIT,
          amount: totalRefundAmount.toFixed(2),
          memo: 'Increase customer wallet liability for wallet refund.',
          referenceType: 'refund',
          referenceId: input.refund.id,
        });
      } else {
        lines.push({
          ledgerAccountId: platformAccounts.gatewayClearingAccountId,
          direction: LedgerDirection.CREDIT,
          amount: totalRefundAmount.toFixed(2),
          memo: 'Reduce gateway clearing for original-method refund.',
          referenceType: 'refund',
          referenceId: input.refund.id,
        });
      }

      this.assertBalanced(lines);

      const journalEntry = await tx.journalEntry.create({
        data: {
          sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
          sourceId: input.refund.id,
          occurredAt: input.refund.processedAt ?? new Date(),
          currencyCode: input.refund.currencyCode,
          status: JournalEntryStatus.POSTED,
          description: 'Refund succeeded accounting posting.',
          metadataJson: {
            postingVersion: 1,
            source: 'refund-succeeded',
            paymentId: input.refund.paymentId,
            destination: input.refund.destination,
            refundAmount: totalRefundAmount.toFixed(2),
            practitionerRefundAmount: practitionerRefundAmount.toFixed(2),
            platformRefundAmount: platformRefundAmount.toFixed(2),
            cancellationPolicySnapshot:
              this.extractCancellationPolicySnapshot(input.refund.metadataJson),
          },
        },
      });

      await tx.journalLine.createMany({
        data: lines.map((line) => ({
          journalEntryId: journalEntry.id,
          ...line,
        })),
      });

      const hydrated = await tx.journalEntry.findUniqueOrThrow({
        where: { id: journalEntry.id },
        include: { lines: true },
      });

      return {
        journalEntry: hydrated,
        wasAlreadyPosted: false,
      };
    });
  }

  async postPractitionerPayout(input: {
    payout: {
      payoutId: string;
      settlementId: string;
      practitionerId: string;
      amountPaid: Prisma.Decimal;
      settlementAppliedAmount: Prisma.Decimal;
      currencyCode: string;
      effectiveAt: Date;
      payoutMethodSnapshot: Prisma.JsonValue | null;
      transferFeeAmount: Prisma.Decimal | null;
      transferFeeTreatment: TransferFeeTreatment;
    };
    tx?: Prisma.TransactionClient;
  }) {
    return this.withTx(input.tx, async (tx) => {
      const existing = await tx.journalEntry.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: JournalEntrySourceType.PRACTITIONER_PAYOUT,
            sourceId: input.payout.payoutId,
          },
        },
        include: { lines: true },
      });
      if (existing) {
        return { journalEntry: existing, wasAlreadyPosted: true };
      }

      const platformAccounts =
        await this.accountingLedgerAccountService.ensurePlatformAccounts(
          input.payout.currencyCode,
          tx,
        );
      const practitionerPayableAccountId =
        await this.accountingLedgerAccountService.ensurePractitionerPayableAccount(
          {
            practitionerId: input.payout.practitionerId,
            currencyCode: input.payout.currencyCode,
            tx,
          },
        );

      const amountPaid = this.toMoney(input.payout.amountPaid);
      const settlementAppliedAmount = this.toMoney(
        input.payout.settlementAppliedAmount,
      );
      const transferFeeAmount = input.payout.transferFeeAmount
        ? this.toMoney(input.payout.transferFeeAmount)
        : this.readMoneyFromMetadata(
            input.payout.payoutMethodSnapshot,
            'transferFeeAmount',
          );

      const lines: JournalLineDraft[] = [
        {
          ledgerAccountId: practitionerPayableAccountId,
          direction: LedgerDirection.DEBIT,
          amount: settlementAppliedAmount.toFixed(2),
          memo: 'Settle practitioner payable via payout.',
          referenceType: 'settlement_payout',
          referenceId: input.payout.payoutId,
        },
        {
          ledgerAccountId: platformAccounts.platformCashAccountId,
          direction: LedgerDirection.CREDIT,
          amount: amountPaid.toFixed(2),
          memo: 'Cash outflow for practitioner payout.',
          referenceType: 'settlement_payout',
          referenceId: input.payout.payoutId,
        },
      ];

      if (transferFeeAmount.gt(0)) {
        if (
          input.payout.transferFeeTreatment ===
          'DEDUCT_FROM_PRACTITIONER'
        ) {
          lines.push({
            ledgerAccountId: platformAccounts.transferFeeRecoveryRevenueAccountId,
            direction: LedgerDirection.CREDIT,
            amount: transferFeeAmount.toFixed(2),
            memo: 'Recognize transfer fee recovery deducted from practitioner payout.',
            referenceType: 'settlement_payout',
            referenceId: input.payout.payoutId,
          });
        } else {
          lines.push({
            ledgerAccountId: platformAccounts.transferFeesExpenseAccountId,
            direction: LedgerDirection.DEBIT,
            amount: transferFeeAmount.toFixed(2),
            memo: 'Recognize transfer fee expense for practitioner payout.',
            referenceType: 'settlement_payout',
            referenceId: input.payout.payoutId,
          });
          lines.push({
            ledgerAccountId: platformAccounts.platformCashAccountId,
            direction: LedgerDirection.CREDIT,
            amount: transferFeeAmount.toFixed(2),
            memo: 'Cash outflow for payout transfer fee.',
            referenceType: 'settlement_payout',
            referenceId: input.payout.payoutId,
          });
        }
      }

      this.assertBalanced(lines);

      const journalEntry = await tx.journalEntry.create({
        data: {
          sourceType: JournalEntrySourceType.PRACTITIONER_PAYOUT,
          sourceId: input.payout.payoutId,
          occurredAt: input.payout.effectiveAt,
          currencyCode: input.payout.currencyCode,
          status: JournalEntryStatus.POSTED,
          description: 'Practitioner payout accounting posting.',
          metadataJson: {
            postingVersion: 2,
            source: 'practitioner-payout',
            settlementId: input.payout.settlementId,
            amountPaid: amountPaid.toFixed(2),
            settlementAppliedAmount: settlementAppliedAmount.toFixed(2),
            transferFeeAmount: transferFeeAmount.toFixed(2),
            transferFeeTreatment: input.payout.transferFeeTreatment,
          },
        },
      });

      await tx.journalLine.createMany({
        data: lines.map((line) => ({
          journalEntryId: journalEntry.id,
          ...line,
        })),
      });

      const hydrated = await tx.journalEntry.findUniqueOrThrow({
        where: { id: journalEntry.id },
        include: { lines: true },
      });

      return {
        journalEntry: hydrated,
        wasAlreadyPosted: false,
      };
    });
  }

  private toMoney(input: Prisma.Decimal | string) {
    return this.moneyAmountService.toDecimal(input).toDecimalPlaces(2);
  }

  private readMoneyFromMetadata(
    metadataJson: Prisma.JsonValue | null | undefined,
    key: string,
  ) {
    if (!metadataJson || typeof metadataJson !== 'object') {
      return this.moneyAmountService.toDecimal(0);
    }

    const metadata = metadataJson as Record<string, unknown>;
    const value = metadata[key];
    if (typeof value !== 'string' && typeof value !== 'number') {
      return this.moneyAmountService.toDecimal(0);
    }
    return this.moneyAmountService.toDecimal(value).toDecimalPlaces(2);
  }

  private extractCancellationPolicySnapshot(
    metadataJson: Prisma.JsonValue | null | undefined,
  ) {
    if (!metadataJson || typeof metadataJson !== 'object') {
      return null;
    }

    const metadata = metadataJson as Record<string, unknown>;
    const source = metadata['source'];
    if (source !== 'session-cancellation-policy') {
      return null;
    }

    return {
      source,
      policy: metadata['policy'] ?? null,
      policyRecordId: metadata['policyRecordId'] ?? null,
      financialAllocation: metadata['financialAllocation'] ?? null,
    };
  }

  private assertBalanced(lines: JournalLineDraft[]) {
    const debit = lines
      .filter((line) => line.direction === LedgerDirection.DEBIT)
      .reduce((sum, line) => sum.add(this.moneyAmountService.toDecimal(line.amount)), this.moneyAmountService.toDecimal(0));
    const credit = lines
      .filter((line) => line.direction === LedgerDirection.CREDIT)
      .reduce((sum, line) => sum.add(this.moneyAmountService.toDecimal(line.amount)), this.moneyAmountService.toDecimal(0));

    if (!debit.equals(credit)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.unbalancedJournalEntry',
        error: 'FINANCIAL_OPERATIONS_UNBALANCED_JOURNAL_ENTRY',
      });
    }
  }
}
