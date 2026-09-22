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

type JournalPostResult = {
  journalEntry:
    | Prisma.JournalEntryGetPayload<{ include: { lines: true } }>
    | Prisma.JournalEntryGetPayload<Record<string, never>>;
  wasAlreadyPosted: boolean;
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
    breakdown?: {
      practitionerShareAmount: string;
      platformCommissionAmount: string;
      currencyCode: string;
    };
    tx?: Prisma.TransactionClient;
  }): Promise<JournalPostResult> {
    return this.withTx(input.tx, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`journal:PAYMENT_CAPTURED:${input.payment.id}`})::bigint)`;
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

      const practitionerShare = this.toMoney(
        input.breakdown?.practitionerShareAmount ?? '0',
      );
      const platformCommission = this.toMoney(
        input.breakdown?.platformCommissionAmount ?? '0',
      );
      const amountFromGateway = this.toMoney(input.payment.amountFromGateway);
      const amountFromWallet = this.toMoney(input.payment.amountFromWallet);
      const totalAmount = this.toMoney(input.payment.amountTotal);
      const gatewayFees = input.payment.gatewayFeeAmountSnapshot
        ? this.toMoney(input.payment.gatewayFeeAmountSnapshot)
        : this.readMoneyFromMetadata(
            input.payment.metadataJson,
            'gatewayFeeAmount',
          );
      const vatAmount = input.payment.vatAmountSnapshot
        ? this.toMoney(input.payment.vatAmountSnapshot)
        : this.readMoneyFromMetadata(input.payment.metadataJson, 'vatAmount');
      const vatRatePercent = input.payment.vatRatePercentSnapshot
        ? this.toMoney(input.payment.vatRatePercentSnapshot)
        : this.readMoneyFromMetadata(
            input.payment.metadataJson,
            'vatRatePercent',
          );
      const gatewayFeeRatePercent = input.payment.gatewayFeeRatePercentSnapshot
        ? this.toMoney(input.payment.gatewayFeeRatePercentSnapshot)
        : this.readMoneyFromMetadata(
            input.payment.metadataJson,
            'gatewayFeeRatePercent',
          );
      const gatewayFeeFixedAmount = input.payment.gatewayFeeFixedAmountSnapshot
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
        lines.push({
          ledgerAccountId: platformAccounts.deferredSessionFundsAccountId,
          direction: LedgerDirection.CREDIT,
          amount: totalAmount.toFixed(2),
          memo: 'Hold captured session funds until the accounting decision is credited.',
          referenceType: 'payment',
          referenceId: input.payment.id,
        });
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
            postingVersion: 2,
            recognition: practitionerPayableAccountId ? 'DEFERRED' : 'PLATFORM',
            source: 'payment-captured',
            allocationSnapshotAvailable: Boolean(input.breakdown),
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
                input.payment.commissionPractitionerRatePercent?.toString() ??
                null,
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

  /** Called in the same transaction as the approved earning ledger credit. */
  async postSessionEarningRecognized(input: {
    reviewId: string;
    paymentId: string;
    practitionerId: string;
    allocatedAmount: Prisma.Decimal;
    practitionerSourceAmount: Prisma.Decimal;
    sourceCurrency: string;
    walletCurrency: string;
    walletCredit: Prisma.Decimal;
    occurredAt: Date;
    tx: Prisma.TransactionClient;
  }) {
    const tx = input.tx;
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: input.paymentId },
    });
    // Reconstruct only from the persisted collection snapshot, never live prices.
    const captured = await this.postPaymentCaptured({ payment, tx });
    const sourceAccounts =
      await this.accountingLedgerAccountService.ensurePlatformAccounts(
        input.sourceCurrency,
        tx,
      );
    const sourcePayable =
      await this.accountingLedgerAccountService.ensurePractitionerPayableAccount(
        {
          practitionerId: input.practitionerId,
          currencyCode: input.sourceCurrency,
          tx,
        },
      );
    const metadata = (captured.journalEntry.metadataJson ?? {}) as Record<
      string,
      unknown
    >;
    const deferred = metadata.recognition === 'DEFERRED';
    const platform = input.allocatedAmount.sub(input.practitionerSourceAmount);
    const lines: JournalLineDraft[] = [];
    const add = (
      account: string,
      direction: LedgerDirection,
      amount: Prisma.Decimal,
      memo: string,
    ) => {
      if (amount.isZero()) return;
      lines.push({
        ledgerAccountId: account,
        direction: amount.lt(0)
          ? direction === 'DEBIT'
            ? 'CREDIT'
            : 'DEBIT'
          : direction,
        amount: amount.abs().toFixed(2),
        memo,
        referenceType: 'session-earning-review',
        referenceId: input.reviewId,
      });
    };
    if (deferred) {
      add(
        sourceAccounts.deferredSessionFundsAccountId,
        'DEBIT',
        input.allocatedAmount,
        'Release approved session funds.',
      );
      add(
        sourceAccounts.platformRevenueAccountId,
        'CREDIT',
        platform,
        'Recognize approved platform allocation.',
      );
      add(
        sourcePayable,
        'CREDIT',
        input.practitionerSourceAmount,
        'Recognize approved practitioner entitlement.',
      );
    } else {
      // Version-one journals already recognized checkout allocations. Append
      // only the accountant-approved difference; preserve the original journal.
      const previousPractitioner = this.readMoneyFromMetadata(
        captured.journalEntry.metadataJson,
        'practitionerShareAmount',
      );
      const delta = input.practitionerSourceAmount.sub(previousPractitioner);
      add(
        sourceAccounts.platformRevenueAccountId,
        'DEBIT',
        delta,
        'Adjust legacy checkout allocation to the approved decision.',
      );
      add(
        sourcePayable,
        'CREDIT',
        delta,
        'Adjust legacy practitioner payable.',
      );
    }
    if (
      input.sourceCurrency !== input.walletCurrency &&
      input.practitionerSourceAmount.gt(0)
    ) {
      add(
        sourcePayable,
        'DEBIT',
        input.practitionerSourceAmount,
        'Convert the approved source entitlement.',
      );
      add(
        sourceAccounts.foreignExchangeClearingAccountId,
        'CREDIT',
        input.practitionerSourceAmount,
        'Source side of approved currency conversion.',
      );
    } else {
      const difference = input.walletCredit.sub(input.practitionerSourceAmount);
      add(
        sourceAccounts.earningAdjustmentsAccountId,
        'DEBIT',
        difference,
        'Explicit wallet credit adjustment.',
      );
      add(
        sourcePayable,
        'CREDIT',
        difference,
        'Apply approved wallet credit adjustment.',
      );
    }
    await this.postLifecycleEntry({
      tx,
      sourceType: JournalEntrySourceType.SESSION_EARNING_RECOGNIZED,
      sourceId: input.reviewId,
      currencyCode: input.sourceCurrency,
      occurredAt: input.occurredAt,
      lines,
      metadata: {
        paymentId: input.paymentId,
        reviewId: input.reviewId,
        allocatedAmount: input.allocatedAmount.toFixed(2),
        practitionerSourceAmount: input.practitionerSourceAmount.toFixed(2),
        walletCredit: input.walletCredit.toFixed(2),
        walletCurrency: input.walletCurrency,
        adjustedLegacyCapture: !deferred,
      },
    });
    if (
      input.sourceCurrency !== input.walletCurrency &&
      input.walletCredit.gt(0)
    ) {
      const walletAccounts =
        await this.accountingLedgerAccountService.ensurePlatformAccounts(
          input.walletCurrency,
          tx,
        );
      const walletPayable =
        await this.accountingLedgerAccountService.ensurePractitionerPayableAccount(
          {
            practitionerId: input.practitionerId,
            currencyCode: input.walletCurrency,
            tx,
          },
        );
      await this.postLifecycleEntry({
        tx,
        sourceType: JournalEntrySourceType.SESSION_EARNING_RECOGNIZED,
        sourceId: `${input.reviewId}:wallet`,
        currencyCode: input.walletCurrency,
        occurredAt: input.occurredAt,
        lines: [
          {
            ledgerAccountId: walletAccounts.foreignExchangeClearingAccountId,
            direction: 'DEBIT',
            amount: input.walletCredit.toFixed(2),
            memo: 'Wallet side of approved currency conversion.',
            referenceType: 'session-earning-review',
            referenceId: input.reviewId,
          },
          {
            ledgerAccountId: walletPayable,
            direction: 'CREDIT',
            amount: input.walletCredit.toFixed(2),
            memo: 'Approved practitioner wallet payable.',
            referenceType: 'session-earning-review',
            referenceId: input.reviewId,
          },
        ],
        metadata: {
          paymentId: input.paymentId,
          reviewId: input.reviewId,
          sourceCurrency: input.sourceCurrency,
          sourceAmount: input.practitionerSourceAmount.toFixed(2),
        },
      });
    }
  }

  private async postLifecycleEntry(input: {
    tx: Prisma.TransactionClient;
    sourceType: JournalEntrySourceType;
    sourceId: string;
    currencyCode: string;
    occurredAt: Date;
    lines: JournalLineDraft[];
    metadata: Prisma.InputJsonObject;
  }) {
    await input.tx
      .$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`journal:${input.sourceType}:${input.sourceId}`})::bigint)`;
    const existing = await input.tx.journalEntry.findUnique({
      where: {
        sourceType_sourceId: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
    });
    if (existing) return existing;
    this.assertBalanced(input.lines);
    return input.tx.journalEntry.create({
      data: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        currencyCode: input.currencyCode,
        occurredAt: input.occurredAt,
        status: 'POSTED',
        description: 'Session lifecycle accounting posting.',
        metadataJson: { postingVersion: 2, ...input.metadata },
        lines: { create: input.lines },
      },
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
    recognition?: {
      allocatedRefundAmount: string;
      practitionerSourceRefundAmount: string;
      platformRefundAmount: string;
      walletCurrency: string;
      walletRefundAmount: string;
      availableDebit: string;
      recoveryAmount: string;
    };
    tx?: Prisma.TransactionClient;
  }): Promise<JournalPostResult> {
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

      if (input.recognition) {
        return this.postRecognizedRefund(
          input as typeof input & {
            recognition: NonNullable<typeof input.recognition>;
          },
          tx,
        );
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
      const platformRefundAmount = this.toMoney(
        input.split.platformRefundAmount,
      );
      const totalRefundAmount = this.toMoney(input.refund.amount);
      const vatReversal = await this.calculateRefundVatReversal({
        paymentId: input.refund.paymentId,
        refundId: input.refund.id,
        refundAmount: totalRefundAmount,
        tx,
      });

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
      if (vatReversal.gt(0)) {
        lines.push({
          ledgerAccountId: platformAccounts.vatPayableAccountId,
          direction: LedgerDirection.DEBIT,
          amount: vatReversal.toFixed(2),
          memo: 'Reverse VAT payable for the refunded collection share.',
          referenceType: 'refund',
          referenceId: input.refund.id,
        });
        lines.push({
          ledgerAccountId: platformAccounts.platformRevenueAccountId,
          direction: LedgerDirection.CREDIT,
          amount: vatReversal.toFixed(2),
          memo: 'Restore the VAT reclassification for the refunded collection share.',
          referenceType: 'refund',
          referenceId: input.refund.id,
        });
      }

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
            vatReversalAmount: vatReversal.toFixed(2),
            cancellationPolicySnapshot: this.extractCancellationPolicySnapshot(
              input.refund.metadataJson,
            ),
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

  private async postRecognizedRefund(
    input: Parameters<
      AccountingJournalPostingService['postRefundSucceeded']
    >[0],
    tx: Prisma.TransactionClient,
  ): Promise<JournalPostResult> {
    const allocation = input.recognition!;
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: input.refund.paymentId },
    });
    const capture = await this.postPaymentCaptured({ payment, tx });
    const allocated = this.toMoney(allocation.allocatedRefundAmount);
    const captureMetadata = (capture.journalEntry.metadataJson ?? {}) as Record<
      string,
      unknown
    >;
    if (captureMetadata.recognition !== 'DEFERRED' && allocated.isZero()) {
      // Legacy receipt journals already recognized pending allocations.
      const fraction = input.refund.amount.div(payment.amountTotal);
      const practitioner = this.readMoneyFromMetadata(
        capture.journalEntry.metadataJson,
        'practitionerShareAmount',
      )
        .mul(fraction)
        .toDecimalPlaces(2);
      return this.postRefundSucceeded({
        ...input,
        split: {
          practitionerRefundAmount: practitioner.toFixed(2),
          platformRefundAmount: input.refund.amount
            .sub(practitioner)
            .toFixed(2),
        },
        recognition: undefined,
        tx,
      });
    }
    const total = this.toMoney(input.refund.amount);
    const sourcePractitioner = this.toMoney(
      allocation.practitionerSourceRefundAmount,
    );
    const platform = this.toMoney(allocation.platformRefundAmount);
    const walletRefund = this.toMoney(allocation.walletRefundAmount);
    const debit = this.toMoney(allocation.availableDebit);
    const recovery = this.toMoney(allocation.recoveryAmount);
    const vatReversal = await this.calculateRefundVatReversal({
      paymentId: input.refund.paymentId,
      refundId: input.refund.id,
      refundAmount: total,
      tx,
    });
    if (
      allocated.gt(total) ||
      !sourcePractitioner.add(platform).equals(allocated) ||
      !debit.add(recovery).equals(walletRefund)
    ) {
      throw new BadRequestException({
        error: 'FINANCIAL_OPERATIONS_REFUND_ALLOCATION_INVALID',
      });
    }
    const accounts =
      await this.accountingLedgerAccountService.ensurePlatformAccounts(
        input.refund.currencyCode,
        tx,
      );
    const lines: JournalLineDraft[] = [];
    const add = (
      account: string,
      direction: LedgerDirection,
      amount: Prisma.Decimal,
      memo: string,
    ) => {
      if (amount.isZero()) return;
      lines.push({
        ledgerAccountId: account,
        direction: amount.lt(0)
          ? direction === 'DEBIT'
            ? 'CREDIT'
            : 'DEBIT'
          : direction,
        amount: amount.abs().toFixed(2),
        memo,
        referenceType: 'refund',
        referenceId: input.refund.id,
      });
    };
    add(
      accounts.deferredSessionFundsAccountId,
      'DEBIT',
      total.sub(allocated),
      'Return session funds not yet recognized.',
    );
    add(
      accounts.platformRevenueAccountId,
      'DEBIT',
      platform,
      'Reverse recognized platform allocation.',
    );
    add(
      accounts.vatPayableAccountId,
      'DEBIT',
      vatReversal,
      'Reverse VAT payable for the refunded collection share.',
    );
    add(
      accounts.platformRevenueAccountId,
      'CREDIT',
      vatReversal,
      'Restore the VAT reclassification for the refunded collection share.',
    );
    add(
      accounts.foreignExchangeClearingAccountId,
      'DEBIT',
      sourcePractitioner,
      'Reverse the source practitioner allocation.',
    );
    if (allocation.walletCurrency === input.refund.currencyCode) {
      const adjustment = walletRefund.sub(sourcePractitioner);
      add(
        accounts.foreignExchangeClearingAccountId,
        'DEBIT',
        adjustment,
        'Reverse approved wallet adjustment.',
      );
      add(
        accounts.earningAdjustmentsAccountId,
        'CREDIT',
        adjustment,
        'Reverse the refunded wallet adjustment expense.',
      );
    }
    add(
      input.refund.destination === RefundDestination.CUSTOMER_WALLET
        ? accounts.customerWalletLiabilityAccountId
        : accounts.gatewayClearingAccountId,
      'CREDIT',
      total,
      'Return the exact refund amount to its recorded destination.',
    );
    const entry = await this.postLifecycleEntry({
      tx,
      sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
      sourceId: input.refund.id,
      currencyCode: input.refund.currencyCode,
      occurredAt: input.refund.processedAt ?? new Date(),
      lines,
      metadata: {
        paymentId: input.refund.paymentId,
        refundAmount: total.toFixed(2),
        destination: input.refund.destination,
        allocation,
        vatReversalAmount: vatReversal.toFixed(2),
      },
    });
    if (walletRefund.gt(0) && input.refund.practitionerId) {
      const walletAccounts =
        await this.accountingLedgerAccountService.ensurePlatformAccounts(
          allocation.walletCurrency,
          tx,
        );
      const payable =
        await this.accountingLedgerAccountService.ensurePractitionerPayableAccount(
          {
            practitionerId: input.refund.practitionerId,
            currencyCode: allocation.walletCurrency,
            tx,
          },
        );
      await this.postLifecycleEntry({
        tx,
        sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
        sourceId: `${input.refund.id}:wallet`,
        currencyCode: allocation.walletCurrency,
        occurredAt: input.refund.processedAt ?? new Date(),
        lines: [
          {
            ledgerAccountId: payable,
            direction: 'DEBIT',
            amount: debit.toFixed(2),
            memo: 'Reverse remaining practitioner payable.',
            referenceType: 'refund',
            referenceId: input.refund.id,
          },
          {
            ledgerAccountId:
              walletAccounts.practitionerRecoveryReceivableAccountId,
            direction: 'DEBIT',
            amount: recovery.toFixed(2),
            memo: 'Recognize practitioner recovery for already paid or unavailable earnings.',
            referenceType: 'refund',
            referenceId: input.refund.id,
          },
          {
            ledgerAccountId: walletAccounts.foreignExchangeClearingAccountId,
            direction: 'CREDIT',
            amount: walletRefund.toFixed(2),
            memo: 'Reverse the wallet side of the earning allocation.',
            referenceType: 'refund',
            referenceId: input.refund.id,
          },
        ].filter((line) =>
          this.toMoney(line.amount).gt(0),
        ) as JournalLineDraft[],
        metadata: {
          paymentId: input.refund.paymentId,
          refundId: input.refund.id,
          sourceAmount: sourcePractitioner.toFixed(2),
          sourceCurrency: input.refund.currencyCode,
        },
      });
    }
    return { journalEntry: entry, wasAlreadyPosted: false };
  }

  private async calculateRefundVatReversal(input: {
    paymentId: string;
    refundId: string;
    refundAmount: Prisma.Decimal;
    tx: Prisma.TransactionClient;
  }) {
    const payment = await input.tx.payment.findUniqueOrThrow({
      where: { id: input.paymentId },
      select: { amountTotal: true, vatAmountSnapshot: true },
    });
    const total = this.toMoney(payment.amountTotal);
    const vat = payment.vatAmountSnapshot
      ? this.toMoney(payment.vatAmountSnapshot)
      : new Prisma.Decimal(0);
    if (total.lte(0) || vat.lte(0)) return new Prisma.Decimal(0);

    const prior = await input.tx.refund.aggregate({
      where: {
        paymentId: input.paymentId,
        status: 'SUCCEEDED',
        id: { not: input.refundId },
      },
      _sum: { amount: true },
    });
    const priorAmount = prior._sum.amount ?? new Prisma.Decimal(0);
    const cumulativeAmount = Prisma.Decimal.min(
      total,
      priorAmount.add(input.refundAmount),
    );
    const priorVat = vat.mul(priorAmount).div(total).toDecimalPlaces(2);
    const cumulativeVat = vat
      .mul(cumulativeAmount)
      .div(total)
      .toDecimalPlaces(2);
    return cumulativeVat.sub(priorVat);
  }

  async postPractitionerPayout(input: {
    payout: {
      payoutId: string;
      settlementId?: string | null;
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
          memo: input.payout.settlementId
            ? 'Settle practitioner payable via settlement payout.'
            : 'Settle practitioner payable via manual payout.',
          referenceType: input.payout.settlementId
            ? 'settlement_payout'
            : 'manual_payout',
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
        if (input.payout.transferFeeTreatment === 'DEDUCT_FROM_PRACTITIONER') {
          lines.push({
            ledgerAccountId:
              platformAccounts.transferFeeRecoveryRevenueAccountId,
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
            settlementId: input.payout.settlementId ?? null,
            payoutKind: input.payout.settlementId ? 'SETTLEMENT' : 'MANUAL',
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
      .reduce(
        (sum, line) => sum.add(this.moneyAmountService.toDecimal(line.amount)),
        this.moneyAmountService.toDecimal(0),
      );
    const credit = lines
      .filter((line) => line.direction === LedgerDirection.CREDIT)
      .reduce(
        (sum, line) => sum.add(this.moneyAmountService.toDecimal(line.amount)),
        this.moneyAmountService.toDecimal(0),
      );

    if (!debit.equals(credit)) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.unbalancedJournalEntry',
        error: 'FINANCIAL_OPERATIONS_UNBALANCED_JOURNAL_ENTRY',
      });
    }
  }
}
