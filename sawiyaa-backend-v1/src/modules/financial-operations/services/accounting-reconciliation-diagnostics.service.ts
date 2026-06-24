import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CustomerWalletEntryDirection,
  CustomerWalletEntryType,
  CustomerWalletReservationStatus,
  JournalEntrySourceType,
  LedgerDirection,
  LedgerEntryType,
  PackageSettlementStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RefundStatus,
  WalletBalanceBucket,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountingReconciliationService } from './accounting-reconciliation.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import {
  ACCOUNTING_RECONCILIATION_ISSUE_CODES,
  ReconciliationIssue,
  ReconciliationResult,
} from '../types/accounting-reconciliation.types';
import { ExtractPaymentLedgerBreakdownService } from './extract-payment-ledger-breakdown.service';

type JournalWithLines = {
  id: string;
  occurredAt: Date;
  currencyCode: string;
  metadataJson: Prisma.JsonValue | null;
  lines: Array<{
    direction: LedgerDirection;
    amount: Prisma.Decimal;
    ledgerAccountId: string;
    referenceType: string | null;
    referenceId: string | null;
  }>;
} | null;

@Injectable()
export class AccountingReconciliationDiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerRepository: LedgerRepository,
    private readonly accountingReconciliationService: AccountingReconciliationService,
    private readonly extractPaymentLedgerBreakdownService: ExtractPaymentLedgerBreakdownService,
  ) {}

  async reconcilePayment(paymentId: string): Promise<ReconciliationResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        paymentPurpose: true,
        sessionId: true,
        practitionerId: true,
        patientId: true,
        currencyCode: true,
        amountSubtotal: true,
        amountDiscount: true,
        amountTotal: true,
        amountFromWallet: true,
        amountFromGateway: true,
        couponId: true,
        couponCodeSnapshot: true,
        couponDiscountSnapshot: true,
        couponPlatformShareSnapshot: true,
        couponPractitionerShareSnapshot: true,
        vatAmountSnapshot: true,
        gatewayFeeAmountSnapshot: true,
        commissionRuleId: true,
        commissionPlatformRatePercent: true,
        commissionPractitionerRatePercent: true,
        metadataJson: true,
        coupon: {
          select: {
            id: true,
            code: true,
            ownerPractitionerId: true,
            couponScope: true,
            status: true,
            discountType: true,
            discountValue: true,
            platformSharePercent: true,
            practitionerSharePercent: true,
          },
        },
      },
    });

    if (!payment) {
      return this.notFoundResult('Payment', paymentId, 'payment');
    }

    const [journal, ledgerEntries, redemption] = await Promise.all([
      this.prisma.journalEntry.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: JournalEntrySourceType.PAYMENT_CAPTURED,
            sourceId: payment.id,
          },
        },
        include: {
          lines: {
            select: {
              direction: true,
              amount: true,
              ledgerAccountId: true,
              referenceType: true,
              referenceId: true,
            },
          },
        },
      }) as Promise<JournalWithLines>,
      this.ledgerRepository.findByPaymentId(payment.id),
      payment.couponId
        ? this.prisma.couponRedemption.findFirst({
            where: {
              paymentId: payment.id,
            },
            orderBy: [{ redeemedAt: 'desc' }],
          })
        : Promise.resolve(null),
    ]);

    const issues: ReconciliationIssue[] = [];
    if (
      payment.status === PaymentStatus.CAPTURED &&
      payment.paymentPurpose !== PaymentPurpose.SESSION_PACKAGE_PURCHASE
    ) {
      const baseEvaluation =
        this.accountingReconciliationService.evaluatePayment({
          amountTotal: payment.amountTotal,
          vatAmountSnapshot: payment.vatAmountSnapshot,
          gatewayFeeAmountSnapshot: payment.gatewayFeeAmountSnapshot,
          journal: journal
            ? {
                id: journal.id,
                occurredAt: journal.occurredAt,
                currencyCode: journal.currencyCode,
                metadataJson: journal.metadataJson,
              }
            : null,
        });
      issues.push(
        ...this.convertAnomalies(
          'Payment',
          payment.id,
          payment.currencyCode,
          baseEvaluation.anomalies,
        ),
      );
    }

    const summary: Record<string, unknown> = {
      paymentStatus: payment.status,
      paymentPurpose: payment.paymentPurpose,
      ledgerEntryCount: ledgerEntries.length,
      journalPresent: Boolean(journal),
      couponPresent: Boolean(payment.couponId),
      redemptionPresent: Boolean(redemption),
    };

    if (
      !payment.amountFromGateway
        .add(payment.amountFromWallet)
        .toDecimalPlaces(2)
        .equals(payment.amountTotal)
    ) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COLLECTION_MISMATCH,
          'ERROR',
          'Collected gateway and wallet amounts do not match the payment total.',
          'Payment',
          payment.id,
          payment.amountTotal.toFixed(2),
          payment.amountFromGateway
            .add(payment.amountFromWallet)
            .toDecimalPlaces(2)
            .toFixed(2),
          payment.currencyCode,
          {
            amountFromGateway: payment.amountFromGateway.toFixed(2),
            amountFromWallet: payment.amountFromWallet.toFixed(2),
          },
        ),
      );
    }

    if (
      !payment.amountSubtotal
        .sub(payment.amountDiscount)
        .toDecimalPlaces(2)
        .equals(payment.amountTotal)
    ) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_AMOUNT_TOTAL_MISMATCH,
          'ERROR',
          'Payment subtotal minus discount does not match the collected total.',
          'Payment',
          payment.id,
          payment.amountSubtotal.sub(payment.amountDiscount).toFixed(2),
          payment.amountTotal.toFixed(2),
          payment.currencyCode,
          {
            amountSubtotal: payment.amountSubtotal.toFixed(2),
            amountDiscount: payment.amountDiscount.toFixed(2),
          },
        ),
      );
    }

    if (journal) {
      if (journal.currencyCode !== payment.currencyCode) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_JOURNAL_METADATA_MISMATCH,
            'ERROR',
            'Payment journal currency does not match the payment currency.',
            'JournalEntry',
            journal.id,
            payment.currencyCode,
            journal.currencyCode,
            payment.currencyCode,
          ),
        );
      }

      const journalBalance = this.sumSignedLines(journal.lines);
      if (!journalBalance.equals(0)) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_JOURNAL_UNBALANCED,
            'ERROR',
            'Payment journal is not balanced.',
            'JournalEntry',
            journal.id,
            '0.00',
            journalBalance.toFixed(2),
            journal.currencyCode,
          ),
        );
      }

      const journalMetadata = this.toRecord(journal.metadataJson);
      const journalAmountTotal = this.toMoney(journalMetadata['amountTotal']);
      const journalGatewayAmount = this.toMoney(
        journalMetadata['amountFromGateway'],
      );
      const journalWalletAmount = this.toMoney(
        journalMetadata['amountFromWallet'],
      );
      const journalPractitionerShare = this.toMoney(
        journalMetadata['practitionerShareAmount'],
      );
      const journalPlatformCommission = this.toMoney(
        journalMetadata['platformCommissionAmount'],
      );

      if (!journalAmountTotal.equals(payment.amountTotal)) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_JOURNAL_METADATA_MISMATCH,
            'ERROR',
            'Payment journal metadata total does not match the payment total.',
            'JournalEntry',
            journal.id,
            payment.amountTotal.toFixed(2),
            journalAmountTotal.toFixed(2),
            journal.currencyCode,
          ),
        );
      }

      if (!journalGatewayAmount.equals(payment.amountFromGateway)) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_JOURNAL_METADATA_MISMATCH,
            'WARNING',
            'Payment journal metadata gateway amount does not match the payment snapshot.',
            'JournalEntry',
            journal.id,
            payment.amountFromGateway.toFixed(2),
            journalGatewayAmount.toFixed(2),
            journal.currencyCode,
          ),
        );
      }

      if (!journalWalletAmount.equals(payment.amountFromWallet)) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_JOURNAL_METADATA_MISMATCH,
            'WARNING',
            'Payment journal metadata wallet amount does not match the payment snapshot.',
            'JournalEntry',
            journal.id,
            payment.amountFromWallet.toFixed(2),
            journalWalletAmount.toFixed(2),
            journal.currencyCode,
          ),
        );
      }

      if (payment.paymentPurpose !== PaymentPurpose.SESSION_PACKAGE_PURCHASE) {
        const expectedBreakdown =
          this.extractPaymentLedgerBreakdownService.extract(payment);
        const practitionerLedgerTotal = this.sumLedgerEntries(
          ledgerEntries.filter(
            (entry) =>
              entry.entryType === LedgerEntryType.PRACTITIONER_EARNING &&
              entry.direction === LedgerDirection.CREDIT,
          ),
        );
        const platformLedgerTotal = this.sumLedgerEntries(
          ledgerEntries.filter(
            (entry) =>
              entry.entryType === LedgerEntryType.PLATFORM_COMMISSION &&
              entry.direction === LedgerDirection.CREDIT,
          ),
        );

        if (!practitionerLedgerTotal.equals(expectedBreakdown.practitionerShareAmount)) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_LEDGER_BREAKDOWN_MISMATCH,
              'ERROR',
              'Practitioner earning ledger total does not match the resolved payment breakdown.',
              'Payment',
              payment.id,
              expectedBreakdown.practitionerShareAmount,
              practitionerLedgerTotal.toFixed(2),
              payment.currencyCode,
              {
                expectedBreakdown: expectedBreakdown.practitionerShareAmount,
                actualBreakdown: practitionerLedgerTotal.toFixed(2),
              },
            ),
          );
        }

        if (!platformLedgerTotal.equals(expectedBreakdown.platformCommissionAmount)) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_LEDGER_BREAKDOWN_MISMATCH,
              'ERROR',
              'Platform commission ledger total does not match the resolved payment breakdown.',
              'Payment',
              payment.id,
              expectedBreakdown.platformCommissionAmount,
              platformLedgerTotal.toFixed(2),
              payment.currencyCode,
              {
                expectedBreakdown: expectedBreakdown.platformCommissionAmount,
                actualBreakdown: platformLedgerTotal.toFixed(2),
              },
            ),
          );
        }

        if (!journalPractitionerShare.equals(expectedBreakdown.practitionerShareAmount)) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_JOURNAL_METADATA_MISMATCH,
              'WARNING',
              'Payment journal practitioner share does not match the resolved payment breakdown.',
              'JournalEntry',
              journal.id,
              expectedBreakdown.practitionerShareAmount,
              journalPractitionerShare.toFixed(2),
              journal.currencyCode,
            ),
          );
        }

        if (!journalPlatformCommission.equals(expectedBreakdown.platformCommissionAmount)) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_JOURNAL_METADATA_MISMATCH,
              'WARNING',
              'Payment journal platform commission does not match the resolved payment breakdown.',
              'JournalEntry',
              journal.id,
              expectedBreakdown.platformCommissionAmount,
              journalPlatformCommission.toFixed(2),
              journal.currencyCode,
            ),
          );
        }

        if (ledgerEntries.length === 0) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_MISSING_LEDGER_ENTRIES,
              'ERROR',
              'Captured session payment has no ledger entries.',
              'Payment',
              payment.id,
              'ledger entries present',
              'none',
              payment.currencyCode,
            ),
          );
        }

        const unexpectedLedgerTypes = ledgerEntries.filter(
          (entry) =>
            entry.entryType !== LedgerEntryType.PRACTITIONER_EARNING &&
            entry.entryType !== LedgerEntryType.PLATFORM_COMMISSION,
        );
        if (unexpectedLedgerTypes.length > 0) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_UNEXPECTED_LEDGER_ENTRY_TYPE,
              'WARNING',
              'Captured session payment has unexpected ledger entry types.',
              'Payment',
              payment.id,
              'only practitioner earning and platform commission entries',
              unexpectedLedgerTypes.map((entry) => entry.entryType).join(', '),
              payment.currencyCode,
              {
                unexpectedEntryIds: unexpectedLedgerTypes.map((entry) => entry.id),
              },
            ),
          );
        }
      } else if (ledgerEntries.length > 0 || Boolean(journal)) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_NON_CAPTURED_HAS_LEDGER_ENTRIES,
            'ERROR',
            'Non-captured payment has ledger or journal postings.',
            'Payment',
            payment.id,
            'no postings',
            `${ledgerEntries.length} ledger entries, journal ${journal ? 'present' : 'missing'}`,
            payment.currencyCode,
          ),
        );
      }
    }

    if (payment.couponId) {
      if (!redemption && payment.status === PaymentStatus.CAPTURED) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COUPON_REDEMPTION_MISSING,
            'ERROR',
            'Captured payment used a coupon but no redemption row was recorded.',
            'CouponRedemption',
            payment.couponId,
            'redemption present',
            'missing',
            payment.currencyCode,
          ),
        );
      }

      if (payment.coupon) {
        if (payment.coupon.ownerPractitionerId && payment.coupon.ownerPractitionerId !== payment.practitionerId) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COUPON_OWNER_MISMATCH,
              'ERROR',
              'Coupon owner does not match the payment practitioner.',
              'Coupon',
              payment.coupon.id,
              payment.practitionerId,
              payment.coupon.ownerPractitionerId,
              payment.currencyCode,
            ),
          );
        }

        if (payment.coupon.couponScope !== 'PRACTITIONER_SESSIONS') {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COUPON_SCOPE_MISMATCH,
              'ERROR',
              'Payment coupon scope is not restricted to practitioner sessions.',
              'Coupon',
              payment.coupon.id,
              'PRACTITIONER_SESSIONS',
              payment.coupon.couponScope,
              payment.currencyCode,
            ),
          );
        }

        if (
          payment.couponDiscountSnapshot !== null &&
          !payment.couponDiscountSnapshot.equals(payment.amountDiscount)
        ) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COUPON_SNAPSHOT_MISMATCH,
              'ERROR',
              'Payment coupon discount snapshot does not match the payment discount.',
              'Coupon',
              payment.coupon.id,
              payment.amountDiscount.toFixed(2),
              payment.couponDiscountSnapshot.toFixed(2),
              payment.currencyCode,
            ),
          );
        }

        if (
          payment.couponCodeSnapshot &&
          payment.coupon.code !== payment.couponCodeSnapshot
        ) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COUPON_SNAPSHOT_MISMATCH,
              'ERROR',
              'Coupon code snapshot does not match the active coupon code.',
              'Coupon',
              payment.coupon.id,
              payment.coupon.code,
              payment.couponCodeSnapshot,
              payment.currencyCode,
            ),
          );
        }

        if (
          payment.couponPlatformShareSnapshot !== null &&
          payment.coupon.platformSharePercent.toFixed(2) !==
            payment.couponPlatformShareSnapshot.toFixed(2)
        ) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COUPON_SNAPSHOT_MISMATCH,
              'WARNING',
              'Payment coupon platform share snapshot does not match the coupon definition.',
              'Coupon',
              payment.coupon.id,
              payment.coupon.platformSharePercent.toFixed(2),
              payment.couponPlatformShareSnapshot.toFixed(2),
              payment.currencyCode,
            ),
          );
        }

        if (
          payment.couponPractitionerShareSnapshot !== null &&
          payment.coupon.practitionerSharePercent.toFixed(2) !==
            payment.couponPractitionerShareSnapshot.toFixed(2)
        ) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COUPON_SNAPSHOT_MISMATCH,
              'WARNING',
              'Payment coupon practitioner share snapshot does not match the coupon definition.',
              'Coupon',
              payment.coupon.id,
              payment.coupon.practitionerSharePercent.toFixed(2),
              payment.couponPractitionerShareSnapshot.toFixed(2),
              payment.currencyCode,
            ),
          );
        }

        if (
          !payment.coupon.platformSharePercent
            .add(payment.coupon.practitionerSharePercent)
            .toDecimalPlaces(2)
            .equals(100)
        ) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COUPON_SNAPSHOT_MISMATCH,
              'WARNING',
              'Coupon platform and practitioner share percentages do not sum to 100%.',
              'Coupon',
              payment.coupon.id,
              '100.00',
              payment.coupon.platformSharePercent
                .add(payment.coupon.practitionerSharePercent)
                .toFixed(2),
              payment.currencyCode,
            ),
          );
        }
      }

      if (redemption) {
        if (payment.amountDiscount.toFixed(2) !== redemption.discountAmount.toFixed(2)) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COUPON_SNAPSHOT_MISMATCH,
              'ERROR',
              'Coupon redemption discount does not match the payment discount snapshot.',
              'CouponRedemption',
              redemption.id,
              payment.amountDiscount.toFixed(2),
              redemption.discountAmount.toFixed(2),
              payment.currencyCode,
            ),
          );
        }

        if (
          payment.amountSubtotal.toFixed(2) !== redemption.grossAmount.toFixed(2)
        ) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COUPON_SNAPSHOT_MISMATCH,
              'ERROR',
              'Coupon redemption gross amount does not match the payment subtotal.',
              'CouponRedemption',
              redemption.id,
              payment.amountSubtotal.toFixed(2),
              redemption.grossAmount.toFixed(2),
              payment.currencyCode,
            ),
          );
        }

        const redemptionShareTotal = redemption.platformDiscountShare.add(
          redemption.practitionerDiscountShare,
        );
        if (!redemptionShareTotal.equals(redemption.discountAmount)) {
          issues.push(
            this.issue(
              ACCOUNTING_RECONCILIATION_ISSUE_CODES.PAYMENT_COUPON_SNAPSHOT_MISMATCH,
              'ERROR',
              'Coupon redemption split does not add up to the discount amount.',
              'CouponRedemption',
              redemption.id,
              redemption.discountAmount.toFixed(2),
              redemptionShareTotal.toFixed(2),
              payment.currencyCode,
            ),
          );
        }
      }
    }

    return this.buildResult('payment', 'Payment', payment.id, payment.currencyCode, issues, summary);
  }

  async reconcilePractitionerWallet(
    practitionerId: string,
    currencyCode: string,
  ): Promise<ReconciliationResult> {
    const normalizedCurrency = this.normalizeCurrency(currencyCode);
    if (!normalizedCurrency) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.currencyRequired',
        error: 'FINANCIAL_RECONCILIATION_CURRENCY_REQUIRED',
      });
    }

    const wallet = await this.prisma.practitionerWallet.findUnique({
      where: {
        practitionerId_currencyCode: {
          practitionerId,
          currencyCode: normalizedCurrency,
        },
      },
    });

    if (!wallet) {
      return this.notFoundResult('PractitionerWallet', `${practitionerId}:${normalizedCurrency}`, 'wallet');
    }

    const aggregates = await this.ledgerRepository.aggregatePractitionerBalances(
      practitionerId,
    );
    const currencyAggregates = aggregates.filter(
      (aggregate) => aggregate.currencyCode === normalizedCurrency,
    );

    const expected = this.calculatePractitionerWalletProjection(currencyAggregates);
    const issues: ReconciliationIssue[] = [];

    if (!wallet.availableBalance.equals(expected.available)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.WALLET_AVAILABLE_MISMATCH,
          'ERROR',
          'Practitioner wallet available balance does not match the ledger projection.',
          'PractitionerWallet',
          wallet.id,
          expected.available.toFixed(2),
          wallet.availableBalance.toFixed(2),
          normalizedCurrency,
        ),
      );
    }

    if (!wallet.pendingBalance.equals(expected.pending)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.WALLET_PENDING_MISMATCH,
          'WARNING',
          'Practitioner wallet pending balance does not match the ledger projection.',
          'PractitionerWallet',
          wallet.id,
          expected.pending.toFixed(2),
          wallet.pendingBalance.toFixed(2),
          normalizedCurrency,
        ),
      );
    }

    if (!wallet.reservedBalance.equals(expected.reserved)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.WALLET_RESERVED_MISMATCH,
          'ERROR',
          'Practitioner wallet reserved balance does not match the ledger projection.',
          'PractitionerWallet',
          wallet.id,
          expected.reserved.toFixed(2),
          wallet.reservedBalance.toFixed(2),
          normalizedCurrency,
        ),
      );
    }

    if (!wallet.lifetimeEarned.equals(expected.lifetimeEarned)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.WALLET_LIFETIME_EARNED_MISMATCH,
          'WARNING',
          'Practitioner wallet lifetime earned does not match the ledger projection.',
          'PractitionerWallet',
          wallet.id,
          expected.lifetimeEarned.toFixed(2),
          wallet.lifetimeEarned.toFixed(2),
          normalizedCurrency,
        ),
      );
    }

    if (!wallet.lifetimePaidOut.equals(expected.lifetimePaidOut)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.WALLET_LIFETIME_PAID_OUT_MISMATCH,
          'WARNING',
          'Practitioner wallet lifetime paid out does not match the ledger projection.',
          'PractitionerWallet',
          wallet.id,
          expected.lifetimePaidOut.toFixed(2),
          wallet.lifetimePaidOut.toFixed(2),
          normalizedCurrency,
        ),
      );
    }

    if (
      expected.lastLedgerEntryAt &&
      wallet.lastLedgerEntryAt &&
      wallet.lastLedgerEntryAt.getTime() !== expected.lastLedgerEntryAt.getTime()
    ) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.WALLET_LAST_ENTRY_MISMATCH,
          'INFO',
          'Practitioner wallet last ledger timestamp does not match the ledger projection.',
          'PractitionerWallet',
          wallet.id,
          expected.lastLedgerEntryAt.toISOString(),
          wallet.lastLedgerEntryAt.toISOString(),
          normalizedCurrency,
        ),
      );
    }

    return this.buildResult(
      'practitioner-wallet',
      'PractitionerWallet',
      wallet.id,
      normalizedCurrency,
      issues,
      {
        practitionerId,
        expected,
      },
    );
  }

  async reconcileSettlement(settlementId: string): Promise<ReconciliationResult> {
    const settlement = await this.prisma.practitionerSettlement.findUnique({
      where: { id: settlementId },
      include: {
        batch: true,
        ledgerEntries: {
          orderBy: [{ createdAt: 'asc' }],
        },
        payoutRecords: {
          orderBy: [{ effectiveAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!settlement) {
      return this.notFoundResult('PractitionerSettlement', settlementId, 'settlement');
    }

    const issues: ReconciliationIssue[] = [];
    const grossFromLedger = this.sumLedgerEntries(
      settlement.ledgerEntries.filter(
        (entry) =>
          entry.entryType === LedgerEntryType.PRACTITIONER_EARNING &&
          entry.direction === LedgerDirection.CREDIT,
      ),
    );
    const payoutLedgerTotal = this.sumLedgerEntries(
      settlement.ledgerEntries.filter(
        (entry) =>
          entry.entryType === LedgerEntryType.SETTLEMENT_PAYOUT &&
          entry.direction === LedgerDirection.DEBIT,
      ),
    );
    const payoutSnapshotTotal = this.sumMoneyFromSnapshots(
      settlement.payoutRecords.map((record) => {
        const snapshot = this.toRecord(record.payoutMethodSnapshot);
        const settlementAppliedAmount =
          snapshot['settlementAppliedAmount'] as
            | string
            | Prisma.Decimal
            | null
            | undefined;
        return settlementAppliedAmount ?? record.amountPaid.toFixed(2);
      }),
    );

    if (settlement.batch.currencyCode !== settlement.currencyCode) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.SETTLEMENT_BATCH_CURRENCY_MISMATCH,
          'ERROR',
          'Settlement currency does not match its batch currency.',
          'SettlementBatch',
          settlement.batch.id,
          settlement.currencyCode,
          settlement.batch.currencyCode,
          settlement.currencyCode,
        ),
      );
    }

    if (!settlement.amountNet.equals(settlement.amountGross.sub(settlement.amountAdjustments))) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.SETTLEMENT_NET_MISMATCH,
          'ERROR',
          'Settlement amount net does not equal gross minus adjustments.',
          'PractitionerSettlement',
          settlement.id,
          settlement.amountGross.sub(settlement.amountAdjustments).toFixed(2),
          settlement.amountNet.toFixed(2),
          settlement.currencyCode,
        ),
      );
    }

    if (!settlement.amountGross.equals(grossFromLedger)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.SETTLEMENT_GROSS_MISMATCH,
          'ERROR',
          'Settlement gross amount does not match the linked ledger entries.',
          'PractitionerSettlement',
          settlement.id,
          grossFromLedger.toFixed(2),
          settlement.amountGross.toFixed(2),
          settlement.currencyCode,
        ),
      );
    }

    const payoutLedgerTotalAbsolute = payoutLedgerTotal.abs();

    if (!settlement.amountPaidTotal.equals(payoutLedgerTotalAbsolute)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.SETTLEMENT_PAYOUT_LEDGER_MISMATCH,
          'ERROR',
          'Settlement paid total does not match payout ledger debits.',
          'PractitionerSettlement',
          settlement.id,
          payoutLedgerTotalAbsolute.toFixed(2),
          settlement.amountPaidTotal.toFixed(2),
          settlement.currencyCode,
        ),
      );
    }

    if (!settlement.amountPaidTotal.equals(payoutSnapshotTotal)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.SETTLEMENT_PAYOUT_LEDGER_MISMATCH,
          'WARNING',
          'Settlement paid total does not match payout snapshot totals.',
          'PractitionerSettlement',
          settlement.id,
          payoutSnapshotTotal.toFixed(2),
          settlement.amountPaidTotal.toFixed(2),
          settlement.currencyCode,
        ),
      );
    }

    if (
      settlement.status === 'PAID' &&
      !settlement.amountPaidTotal.equals(settlement.amountNet)
    ) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.SETTLEMENT_PAID_TOTAL_MISMATCH,
          'ERROR',
          'Paid settlement amount does not equal the settlement net amount.',
          'PractitionerSettlement',
          settlement.id,
          settlement.amountNet.toFixed(2),
          settlement.amountPaidTotal.toFixed(2),
          settlement.currencyCode,
        ),
      );
    }

    return this.buildResult(
      'settlement',
      'PractitionerSettlement',
      settlement.id,
      settlement.currencyCode,
      issues,
      {
        batchId: settlement.batchId,
        batchCurrencyCode: settlement.batch.currencyCode,
        grossFromLedger: grossFromLedger.toFixed(2),
        payoutLedgerTotal: payoutLedgerTotalAbsolute.toFixed(2),
        payoutSnapshotTotal: payoutSnapshotTotal.toFixed(2),
        payoutRecordCount: settlement.payoutRecords.length,
      },
    );
  }

  async reconcileSettlementBatch(batchId: string): Promise<ReconciliationResult> {
    const batch = await this.prisma.settlementBatch.findUnique({
      where: { id: batchId },
      include: {
        settlements: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            currencyCode: true,
            amountNet: true,
            amountPaidTotal: true,
            status: true,
          },
        },
      },
    });

    if (!batch) {
      return this.notFoundResult('SettlementBatch', batchId, 'batch');
    }

    const issues: ReconciliationIssue[] = [];
    const totalNet = this.sumMoneyFromDecimals(
      batch.settlements.map((settlement) => settlement.amountNet),
    );
    const totalPaid = this.sumMoneyFromDecimals(
      batch.settlements.map((settlement) => settlement.amountPaidTotal),
    );

    for (const settlement of batch.settlements) {
      if (settlement.currencyCode !== batch.currencyCode) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.SETTLEMENT_BATCH_CURRENCY_MISMATCH,
            'ERROR',
            'Settlement batch contains a settlement with a different currency.',
            'PractitionerSettlement',
            settlement.id,
            batch.currencyCode,
            settlement.currencyCode,
            batch.currencyCode,
          ),
        );
      }
    }

    return this.buildResult(
      'settlement-batch',
      'SettlementBatch',
      batch.id,
      batch.currencyCode,
      issues,
      {
        settlementCount: batch.settlements.length,
        totalNet: totalNet.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
      },
    );
  }

  async reconcileRefund(refundId: string): Promise<ReconciliationResult> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      select: {
        id: true,
        paymentId: true,
        sessionId: true,
        currencyCode: true,
        amount: true,
        status: true,
        destination: true,
        processedAt: true,
        metadataJson: true,
        payment: {
          select: {
            id: true,
            status: true,
            practitionerId: true,
            amountTotal: true,
            amountSubtotal: true,
            amountDiscount: true,
            currencyCode: true,
            commissionPlatformRatePercent: true,
            metadataJson: true,
          },
        },
      },
    });

    if (!refund) {
      return this.notFoundResult('Refund', refundId, 'refund');
    }

    const [journal, ledgerEntries, walletCreditEntry] = await Promise.all([
      this.prisma.journalEntry.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: JournalEntrySourceType.REFUND_SUCCEEDED,
            sourceId: refund.id,
          },
        },
        include: {
          lines: {
            select: {
              direction: true,
              amount: true,
              ledgerAccountId: true,
              referenceType: true,
              referenceId: true,
            },
          },
        },
      }) as Promise<JournalWithLines>,
      this.ledgerRepository.findByRefundId(refund.id),
      refund.destination === 'CUSTOMER_WALLET'
        ? this.prisma.customerWalletEntry.findFirst({
            where: {
              refundId: refund.id,
              entryType: CustomerWalletEntryType.REFUND_CREDIT,
              direction: CustomerWalletEntryDirection.CREDIT,
            },
          })
        : Promise.resolve(null),
    ]);

    const issues: ReconciliationIssue[] = [];
    if (refund.status === RefundStatus.SUCCEEDED) {
      const baseEvaluation =
        this.accountingReconciliationService.evaluateRefund({
          amount: refund.amount,
          metadataJson: refund.metadataJson,
          sessionId: refund.sessionId,
          journal: journal
            ? {
                id: journal.id,
                occurredAt: journal.occurredAt,
                currencyCode: journal.currencyCode,
                metadataJson: journal.metadataJson,
              }
            : null,
        });
      issues.push(
        ...this.convertAnomalies(
          'Refund',
          refund.id,
          refund.currencyCode,
          baseEvaluation.anomalies,
        ),
      );
    }

    const journalBalance = journal ? this.sumSignedLines(journal.lines) : null;
    if (journal && !journalBalance?.equals(0)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.REFUND_JOURNAL_UNBALANCED,
          'ERROR',
          'Refund journal is not balanced.',
          'JournalEntry',
          journal.id,
          '0.00',
          journalBalance?.toFixed(2) ?? null,
          journal.currencyCode,
        ),
      );
    }

    if (journal && journal.currencyCode !== refund.currencyCode) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.REFUND_JOURNAL_CURRENCY_MISMATCH,
          'ERROR',
          'Refund journal currency does not match the refund currency.',
          'JournalEntry',
          journal.id,
          refund.currencyCode,
          journal.currencyCode,
          refund.currencyCode,
        ),
      );
    }

    if (refund.status === RefundStatus.SUCCEEDED) {
      if (ledgerEntries.length === 0) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.REFUND_LEDGER_MISMATCH,
            'ERROR',
            'Succeeded refund has no reversal ledger entries.',
            'Refund',
            refund.id,
            'ledger entries present',
            'none',
            refund.currencyCode,
          ),
        );
      }

      const breakdown =
        this.extractPaymentLedgerBreakdownService.extract(refund.payment);
      const expectedPractitionerRefund = this.moneyFromRatio(
        this.toMoney(breakdown.practitionerShareAmount),
        refund.amount,
        refund.payment.amountTotal,
      );
      const expectedPlatformRefund = refund.amount
        .sub(expectedPractitionerRefund)
        .toDecimalPlaces(2);

      const practitionerLedgerTotal = this.sumLedgerEntries(
        ledgerEntries.filter(
          (entry) =>
          entry.entryType === LedgerEntryType.REFUND_PRACTITIONER_REVERSAL &&
          entry.direction === LedgerDirection.DEBIT,
        ),
      );
      const practitionerLedgerTotalAbsolute = practitionerLedgerTotal.abs();
      const platformLedgerTotal = this.sumLedgerEntries(
        ledgerEntries.filter(
          (entry) =>
            entry.entryType === LedgerEntryType.REFUND_PLATFORM_REVERSAL &&
            entry.direction === LedgerDirection.DEBIT,
        ),
      );
      const platformLedgerTotalAbsolute = platformLedgerTotal.abs();

      if (!practitionerLedgerTotalAbsolute.equals(expectedPractitionerRefund)) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.REFUND_LEDGER_MISMATCH,
            'ERROR',
            'Refund practitioner reversal does not match the expected ratio.',
            'Refund',
            refund.id,
            expectedPractitionerRefund.toFixed(2),
            practitionerLedgerTotalAbsolute.toFixed(2),
            refund.currencyCode,
          ),
        );
      }

      if (!platformLedgerTotalAbsolute.equals(expectedPlatformRefund)) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.REFUND_LEDGER_MISMATCH,
            'ERROR',
            'Refund platform reversal does not match the expected ratio.',
            'Refund',
            refund.id,
            expectedPlatformRefund.toFixed(2),
            platformLedgerTotalAbsolute.toFixed(2),
            refund.currencyCode,
          ),
        );
      }

      if (refund.destination === 'CUSTOMER_WALLET' && !walletCreditEntry) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.REFUND_CUSTOMER_WALLET_CREDIT_MISSING,
            'ERROR',
            'Customer wallet refund destination is missing a customer wallet credit entry.',
            'CustomerWalletEntry',
            refund.id,
            'wallet credit present',
            'missing',
            refund.currencyCode,
          ),
        );
      }
    } else if (ledgerEntries.length > 0 || Boolean(journal) || Boolean(walletCreditEntry)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.REFUND_LEDGER_MISMATCH,
          'ERROR',
          'Non-succeeded refund already has accounting postings.',
          'Refund',
          refund.id,
          'no postings',
          `${ledgerEntries.length} ledger entries, journal ${journal ? 'present' : 'missing'}`,
          refund.currencyCode,
        ),
      );
    }

    return this.buildResult(
      'refund',
      'Refund',
      refund.id,
      refund.currencyCode,
      issues,
      {
        paymentId: refund.paymentId,
        ledgerEntryCount: ledgerEntries.length,
        walletCreditPresent: Boolean(walletCreditEntry),
      },
    );
  }

  async reconcileCustomerWallet(
    patientId: string,
    currencyCode: string,
  ): Promise<ReconciliationResult> {
    const normalizedCurrency = this.normalizeCurrency(currencyCode);
    if (!normalizedCurrency) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.currencyRequired',
        error: 'FINANCIAL_RECONCILIATION_CURRENCY_REQUIRED',
      });
    }

    const wallet = await this.prisma.customerWallet.findUnique({
      where: {
        patientId_currencyCode: {
          patientId,
          currencyCode: normalizedCurrency,
        },
      },
    });

    if (!wallet) {
      return this.notFoundResult('CustomerWallet', `${patientId}:${normalizedCurrency}`, 'wallet');
    }

    const entries = await this.prisma.customerWalletEntry.findMany({
      where: {
        walletId: wallet.id,
      },
      orderBy: [{ effectiveAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });

    const reservations = await this.prisma.customerWalletReservation.findMany({
      where: {
        walletId: wallet.id,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const issues: ReconciliationIssue[] = [];
    const projection = this.calculateCustomerWalletProjection(entries);
    const activeReservationTotal = this.sumMoneyFromDecimals(
      reservations
        .filter(
          (reservation) =>
            reservation.status === CustomerWalletReservationStatus.ACTIVE,
        )
        .map((reservation) => reservation.amount),
    );

    if (!wallet.availableBalance.equals(projection.available)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.WALLET_AVAILABLE_MISMATCH,
          'ERROR',
          'Customer wallet available balance does not match the entry projection.',
          'CustomerWallet',
          wallet.id,
          projection.available.toFixed(2),
          wallet.availableBalance.toFixed(2),
          normalizedCurrency,
        ),
      );
    }

    if (!wallet.reservedBalance.equals(projection.reserved)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.WALLET_RESERVED_MISMATCH,
          'ERROR',
          'Customer wallet reserved balance does not match the entry projection.',
          'CustomerWallet',
          wallet.id,
          projection.reserved.toFixed(2),
          wallet.reservedBalance.toFixed(2),
          normalizedCurrency,
        ),
      );
    }

    if (!wallet.reservedBalance.equals(activeReservationTotal)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.WALLET_RESERVATION_MISMATCH,
          'ERROR',
          'Customer wallet reserved balance does not match active reservations.',
          'CustomerWallet',
          wallet.id,
          activeReservationTotal.toFixed(2),
          wallet.reservedBalance.toFixed(2),
          normalizedCurrency,
        ),
      );
    }

    return this.buildResult(
      'customer-wallet',
      'CustomerWallet',
      wallet.id,
      normalizedCurrency,
      issues,
      {
        patientId,
        entryCount: entries.length,
        reservationCount: reservations.length,
        activeReservationTotal: activeReservationTotal.toFixed(2),
        projection,
      },
    );
  }

  async reconcilePackageSettlement(
    packageSettlementId: string,
  ): Promise<ReconciliationResult> {
    const packageSettlement = await this.prisma.packageSettlement.findUnique({
      where: { id: packageSettlementId },
      include: {
        purchase: {
          include: {
            payment: {
              select: {
                id: true,
                currencyCode: true,
                amountSubtotal: true,
                amountDiscount: true,
                amountTotal: true,
              },
            },
            sessions: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!packageSettlement) {
      return this.notFoundResult('PackageSettlement', packageSettlementId, 'packageSettlement');
    }

    const issues: ReconciliationIssue[] = [];
    const completedSessionsCount = packageSettlement.purchase.sessions.filter(
      (session) => session.status === 'COMPLETED',
    ).length;
    const releaseEntries = await this.ledgerRepository.findByReference({
      referenceType: 'package-settlement-release',
      referenceId: packageSettlement.id,
      paymentId: packageSettlement.purchase.paymentId ?? null,
    });

    if (packageSettlement.purchase.payment?.currencyCode) {
      const paymentCurrency = packageSettlement.purchase.payment.currencyCode;
      if (paymentCurrency !== packageSettlement.currencyCode) {
        issues.push(
          this.issue(
            ACCOUNTING_RECONCILIATION_ISSUE_CODES.PACKAGE_SETTLEMENT_CURRENCY_MISMATCH,
            'ERROR',
            'Package settlement currency does not match the related payment currency.',
            'PackageSettlement',
            packageSettlement.id,
            paymentCurrency,
            packageSettlement.currencyCode,
            packageSettlement.currencyCode,
          ),
        );
      }
    }

    if (completedSessionsCount !== packageSettlement.completedSessionsCount) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.PACKAGE_SETTLEMENT_COMPLETION_MISMATCH,
          'ERROR',
          'Package settlement completed session count does not match the purchase sessions.',
          'PackageSettlement',
          packageSettlement.id,
          completedSessionsCount,
          packageSettlement.completedSessionsCount,
          packageSettlement.currencyCode,
        ),
      );
    }

    const expectedReleasePractitionerAmount = packageSettlement.releasedPractitionerAmount;
    const releasePractitionerTotal = this.sumLedgerEntries(
      releaseEntries.filter(
        (entry) =>
          entry.entryType === LedgerEntryType.PRACTITIONER_EARNING &&
          entry.direction === LedgerDirection.CREDIT,
      ),
    );
    const releasePlatformTotal = this.sumLedgerEntries(
      releaseEntries.filter(
        (entry) =>
          entry.entryType === LedgerEntryType.PLATFORM_COMMISSION &&
          entry.direction === LedgerDirection.CREDIT,
      ),
    );
    const releasePractitionerTotalAbsolute = releasePractitionerTotal.abs();
    const releasePlatformTotalAbsolute = releasePlatformTotal.abs();
    const heldTotal = packageSettlement.heldPractitionerAmount.add(
      packageSettlement.heldPlatformAmount,
    );
    const expectedHeldTotal = packageSettlement.purchase.payment
      ? packageSettlement.purchase.payment.amountSubtotal.sub(
          packageSettlement.purchase.payment.amountDiscount,
        )
      : heldTotal;

    if (
      packageSettlement.status === PackageSettlementStatus.RELEASED &&
      heldTotal.gt(0) &&
      releaseEntries.length === 0
    ) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.PACKAGE_SETTLEMENT_RELEASE_MISMATCH,
          'ERROR',
          'Released package settlement has no release ledger entries.',
          'PackageSettlement',
          packageSettlement.id,
          'release entries present',
          'none',
          packageSettlement.currencyCode,
        ),
      );
    }

    if (
      packageSettlement.status === PackageSettlementStatus.RELEASED &&
      !releasePractitionerTotalAbsolute.equals(expectedReleasePractitionerAmount)
    ) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.PACKAGE_SETTLEMENT_RELEASE_MISMATCH,
          'ERROR',
          'Released practitioner amount does not match the release ledger entries.',
          'PackageSettlement',
          packageSettlement.id,
          expectedReleasePractitionerAmount.toFixed(2),
          releasePractitionerTotalAbsolute.toFixed(2),
          packageSettlement.currencyCode,
        ),
      );
    }

    if (
      packageSettlement.status === PackageSettlementStatus.RELEASED &&
      !releasePlatformTotalAbsolute.equals(packageSettlement.heldPlatformAmount)
    ) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.PACKAGE_SETTLEMENT_RELEASE_MISMATCH,
          'WARNING',
          'Released platform amount does not match the release ledger entries.',
          'PackageSettlement',
          packageSettlement.id,
          packageSettlement.heldPlatformAmount.toFixed(2),
          releasePlatformTotalAbsolute.toFixed(2),
          packageSettlement.currencyCode,
        ),
      );
    }

    if (!heldTotal.equals(expectedHeldTotal)) {
      issues.push(
        this.issue(
          ACCOUNTING_RECONCILIATION_ISSUE_CODES.PACKAGE_SETTLEMENT_AMOUNT_MISMATCH,
          'ERROR',
          'Held package settlement amounts do not match the purchase snapshot.',
          'PackageSettlement',
          packageSettlement.id,
          expectedHeldTotal.toFixed(2),
          heldTotal.toFixed(2),
          packageSettlement.currencyCode,
        ),
      );
    }

    return this.buildResult(
      'package-settlement',
      'PackageSettlement',
      packageSettlement.id,
      packageSettlement.currencyCode,
      issues,
      {
        purchaseId: packageSettlement.purchaseId,
        completedSessionsCount,
        releaseEntryCount: releaseEntries.length,
        releasePractitionerTotal: releasePractitionerTotalAbsolute.toFixed(2),
        releasePlatformTotal: releasePlatformTotalAbsolute.toFixed(2),
      },
    );
  }

  private buildResult(
    scope: string,
    entityType: string,
    entityId: string,
    currencyCode: string | null,
    issues: ReconciliationIssue[],
    summary?: Record<string, unknown>,
  ): ReconciliationResult {
    return {
      ok: issues.length === 0,
      checkedAt: new Date(),
      scope,
      entityType,
      entityId,
      currencyCode,
      issues,
      summary,
    };
  }

  private notFoundResult(
    entityType: string,
    entityId: string,
    scope: string,
  ): ReconciliationResult {
    return this.buildResult(scope, entityType, entityId, null, [
      this.issue(
        ACCOUNTING_RECONCILIATION_ISSUE_CODES.RESOURCE_NOT_FOUND,
        'ERROR',
        `${entityType} was not found.`,
        entityType,
        entityId,
        'existing resource',
        'missing',
        null,
      ),
    ]);
  }

  private issue(
    code: string,
    severity: ReconciliationIssue['severity'],
    message: string,
    entityType: string,
    entityId: string,
    expected?: string | number | null,
    actual?: string | number | null,
    currencyCode?: string | null,
    metadata?: Record<string, unknown>,
  ): ReconciliationIssue {
    return {
      code,
      severity,
      message,
      entityType,
      entityId,
      expected: expected ?? null,
      actual: actual ?? null,
      currencyCode: currencyCode ?? null,
      metadata,
    };
  }

  private convertAnomalies(
    entityType: string,
    entityId: string,
    currencyCode: string | null,
    anomalies: Array<{ code: string; level: string; message: string }>,
  ): ReconciliationIssue[] {
    return anomalies.map((anomaly) =>
      this.issue(
        anomaly.code,
        anomaly.level === 'CRITICAL'
          ? 'CRITICAL'
          : anomaly.level === 'WARNING'
            ? 'WARNING'
            : 'INFO',
        anomaly.message,
        entityType,
        entityId,
        null,
        null,
        currencyCode,
        { origin: 'legacy-anomaly' },
      ),
    );
  }

  private calculatePractitionerWalletProjection(
    aggregates: Awaited<
      ReturnType<LedgerRepository['aggregatePractitionerBalances']>
    >,
  ) {
    const projection = {
      available: new Prisma.Decimal(0),
      pending: new Prisma.Decimal(0),
      reserved: new Prisma.Decimal(0),
      lifetimeEarned: new Prisma.Decimal(0),
      lifetimePaidOut: new Prisma.Decimal(0),
      lastLedgerEntryAt: null as Date | null,
    };

    for (const aggregate of aggregates) {
      const signed = this.signedAmount(
        aggregate.direction,
        aggregate._sum.amount ?? 0,
      );

      if (aggregate.balanceBucket === WalletBalanceBucket.AVAILABLE) {
        projection.available = projection.available.add(signed);
      } else if (aggregate.balanceBucket === WalletBalanceBucket.PENDING) {
        projection.pending = projection.pending.add(signed);
      } else if (aggregate.balanceBucket === WalletBalanceBucket.RESERVED) {
        projection.reserved = projection.reserved.add(signed);
      }

      if (
        aggregate.entryType === LedgerEntryType.PRACTITIONER_EARNING &&
        aggregate.direction === LedgerDirection.CREDIT
      ) {
        projection.lifetimeEarned = projection.lifetimeEarned.add(
          aggregate._sum.amount ?? 0,
        );
      }

      if (
        aggregate.entryType === LedgerEntryType.SETTLEMENT_PAYOUT &&
        aggregate.direction === LedgerDirection.DEBIT
      ) {
        projection.lifetimePaidOut = projection.lifetimePaidOut.add(
          aggregate._sum.amount ?? 0,
        );
      }

      if (
        aggregate._max.effectiveAt &&
        (!projection.lastLedgerEntryAt ||
          aggregate._max.effectiveAt > projection.lastLedgerEntryAt)
      ) {
        projection.lastLedgerEntryAt = aggregate._max.effectiveAt;
      }
    }

    return projection;
  }

  private calculateCustomerWalletProjection(
    entries: Array<{
      entryType: CustomerWalletEntryType;
      direction: CustomerWalletEntryDirection;
      amount: Prisma.Decimal;
      effectiveAt: Date;
    }>,
  ) {
    const projection = {
      available: new Prisma.Decimal(0),
      reserved: new Prisma.Decimal(0),
      lifetimeCredited: new Prisma.Decimal(0),
      lifetimeDebited: new Prisma.Decimal(0),
    };

    for (const entry of entries) {
      const amount = this.toMoney(entry.amount);

      switch (entry.entryType) {
        case CustomerWalletEntryType.SESSION_PAYMENT_RESERVE:
          if (entry.direction === CustomerWalletEntryDirection.DEBIT) {
            projection.available = projection.available.sub(amount);
            projection.reserved = projection.reserved.add(amount);
          }
          break;
        case CustomerWalletEntryType.SESSION_PAYMENT_CAPTURE:
          if (entry.direction === CustomerWalletEntryDirection.DEBIT) {
            projection.reserved = projection.reserved.sub(amount);
            projection.lifetimeDebited = projection.lifetimeDebited.add(amount);
          }
          break;
        case CustomerWalletEntryType.SESSION_PAYMENT_RELEASE:
          if (entry.direction === CustomerWalletEntryDirection.CREDIT) {
            projection.available = projection.available.add(amount);
            projection.reserved = projection.reserved.sub(amount);
          }
          break;
        case CustomerWalletEntryType.REFUND_CREDIT:
          if (entry.direction === CustomerWalletEntryDirection.CREDIT) {
            projection.available = projection.available.add(amount);
            projection.lifetimeCredited = projection.lifetimeCredited.add(
              amount,
            );
          }
          break;
        case CustomerWalletEntryType.MANUAL_CREDIT:
          if (entry.direction === CustomerWalletEntryDirection.CREDIT) {
            projection.available = projection.available.add(amount);
            projection.lifetimeCredited = projection.lifetimeCredited.add(
              amount,
            );
          }
          break;
        case CustomerWalletEntryType.MANUAL_DEBIT:
        case CustomerWalletEntryType.REVERSAL:
        case CustomerWalletEntryType.ADJUSTMENT:
          if (entry.direction === CustomerWalletEntryDirection.CREDIT) {
            projection.available = projection.available.add(amount);
            projection.lifetimeCredited = projection.lifetimeCredited.add(
              amount,
            );
          } else {
            projection.available = projection.available.sub(amount);
            projection.lifetimeDebited = projection.lifetimeDebited.add(amount);
          }
          break;
      }
    }

    return projection;
  }

  private sumLedgerEntries(
    entries: Array<{ amount: Prisma.Decimal | string | number; direction: LedgerDirection }>,
  ): Prisma.Decimal {
    return entries.reduce(
      (sum: Prisma.Decimal, entry) => {
        const amount = this.toMoney(entry.amount);
        return entry.direction === LedgerDirection.CREDIT
          ? sum.add(amount)
          : sum.sub(amount);
      },
      new Prisma.Decimal(0),
    ) as Prisma.Decimal;
  }

  private sumSignedLines(
    lines: Array<{ amount: Prisma.Decimal; direction: LedgerDirection }>,
  ) {
    return lines.reduce(
      (sum, line) =>
        line.direction === LedgerDirection.CREDIT
          ? sum.add(line.amount)
          : sum.sub(line.amount),
      new Prisma.Decimal(0),
    );
  }

  private sumMoneyFromDecimals(
    values: Array<Prisma.Decimal | string | number>,
  ): Prisma.Decimal {
    return values.reduce(
      (sum: Prisma.Decimal, value) => sum.add(this.toMoney(value)),
      new Prisma.Decimal(0),
    ) as Prisma.Decimal;
  }

  private sumMoneyFromSnapshots(
    values: Array<string | Prisma.Decimal | null | undefined>,
  ): Prisma.Decimal {
    return values.reduce(
      (sum: Prisma.Decimal, value) => sum.add(this.toMoney(value ?? 0)),
      new Prisma.Decimal(0),
    ) as Prisma.Decimal;
  }

  private moneyFromRatio(
    baseAmount: Prisma.Decimal,
    partAmount: Prisma.Decimal,
    totalAmount: Prisma.Decimal,
  ): Prisma.Decimal {
    if (totalAmount.equals(0)) {
      return new Prisma.Decimal(0);
    }
    return baseAmount.mul(partAmount).div(totalAmount).toDecimalPlaces(2);
  }

  private signedAmount(
    direction: LedgerDirection,
    amount: Prisma.Decimal | string | number,
  ): Prisma.Decimal {
    const money = this.toMoney(amount);
    return direction === LedgerDirection.CREDIT ? money : money.neg();
  }

  private toMoney(value: unknown) {
    if (typeof value === 'number') {
      return new Prisma.Decimal(value).toDecimalPlaces(2);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return new Prisma.Decimal(value).toDecimalPlaces(2);
    }
    if (value instanceof Prisma.Decimal) {
      return value.toDecimalPlaces(2);
    }
    return new Prisma.Decimal(0);
  }

  private toRecord(json: Prisma.JsonValue | null | undefined) {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return {};
    }

    return json as Record<string, unknown>;
  }

  private normalizeCurrency(currencyCode: string | null | undefined) {
    const normalized = currencyCode?.trim().toUpperCase();
    if (!normalized || normalized.length !== 3) {
      return null;
    }
    return normalized;
  }
}
