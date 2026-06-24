import { BadRequestException, Injectable } from '@nestjs/common';
import { JournalEntrySourceType, Prisma } from '@prisma/client';
import { GetAdminAccountingDashboardDto } from '../dto/admin-accounting-dashboard.dto';
import { AccountingReadRepository } from '../repositories/accounting-read.repository';
import { PLATFORM_LEDGER_ACCOUNT_CODES } from '../types/accounting.types';
import { AccountingDashboardViewModel } from '../types/accounting-read.types';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class GetAdminAccountingDashboardUseCase {
  constructor(
    private readonly accountingReadRepository: AccountingReadRepository,
  ) {}

  async execute(
    query: GetAdminAccountingDashboardDto,
  ): Promise<AccountingDashboardViewModel> {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to
    ) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const currencyCode = query.currencyCode?.trim().toUpperCase();
    const recentLimit = query.recentLimit ?? 8;

    const [journalEntries, recentJournalEntries, practitionerLiabilityLines] =
      await Promise.all([
        this.accountingReadRepository.listJournalEntriesInRange({
          from,
          to,
          currencyCode,
          recentLimit,
        }),
        this.accountingReadRepository.listRecentJournalEntries({
          currencyCode,
          take: recentLimit,
        }),
        this.accountingReadRepository.listPractitionerLiabilityLinesUntil({
          to,
          currencyCode,
        }),
      ]);

    const grossInflow = journalEntries
      .filter(
        (entry) => entry.sourceType === JournalEntrySourceType.PAYMENT_CAPTURED,
      )
      .reduce((sum, entry) => {
        const metadata = this.toJson(entry.metadataJson);
        return sum.add(this.toMoney(metadata['amountTotal']));
      }, new Prisma.Decimal(0));

    const refundsTotal = journalEntries
      .filter(
        (entry) => entry.sourceType === JournalEntrySourceType.REFUND_SUCCEEDED,
      )
      .reduce((sum, entry) => {
        const metadata = this.toJson(entry.metadataJson);
        return sum.add(this.toMoney(metadata['refundAmount']));
      }, new Prisma.Decimal(0));

    const trendMap = new Map<
      string,
      {
        revenue: Prisma.Decimal;
        payableIncrements: Prisma.Decimal;
        payouts: Prisma.Decimal;
        refunds: Prisma.Decimal;
        fees: Prisma.Decimal;
      }
    >();

    let platformRevenue = new Prisma.Decimal(0);
    let vatTotal = new Prisma.Decimal(0);
    let gatewayFees = new Prisma.Decimal(0);
    let transferFees = new Prisma.Decimal(0);
    let transferFeeRecoveryRevenue = new Prisma.Decimal(0);
    const practitionerPayableOutstanding = practitionerLiabilityLines.reduce(
      (sum, line) =>
        line.direction === 'CREDIT'
          ? sum.add(line.amount)
          : sum.sub(line.amount),
      new Prisma.Decimal(0),
    );

    for (const entry of journalEntries) {
      const bucket = this.getOrCreateTrendBucket(trendMap, entry.occurredAt);

      for (const line of entry.lines) {
        const code = line.ledgerAccount.code;
        const amount = line.amount;
        const signed = line.direction === 'CREDIT' ? amount : amount.neg();

        if (code === PLATFORM_LEDGER_ACCOUNT_CODES.platformRevenue) {
          platformRevenue = platformRevenue.add(signed);
          bucket.revenue = bucket.revenue.add(signed);
        }

        if (code === PLATFORM_LEDGER_ACCOUNT_CODES.vatPayable) {
          vatTotal = vatTotal.add(signed);
        }

        if (code === PLATFORM_LEDGER_ACCOUNT_CODES.gatewayFeesExpense) {
          if (line.direction === 'DEBIT') {
            gatewayFees = gatewayFees.add(amount);
            bucket.fees = bucket.fees.add(amount);
          }
        }

        if (code === PLATFORM_LEDGER_ACCOUNT_CODES.transferFeesExpense) {
          if (line.direction === 'DEBIT') {
            transferFees = transferFees.add(amount);
            bucket.fees = bucket.fees.add(amount);
          }
        }

        if (code === PLATFORM_LEDGER_ACCOUNT_CODES.transferFeeRecoveryRevenue) {
          if (line.direction === 'CREDIT') {
            transferFeeRecoveryRevenue = transferFeeRecoveryRevenue.add(amount);
          } else {
            transferFeeRecoveryRevenue = transferFeeRecoveryRevenue.sub(amount);
          }
        }

        if (
          line.ledgerAccount.scope === 'PRACTITIONER' &&
          line.ledgerAccount.accountType === 'LIABILITY'
        ) {
          if (line.direction === 'CREDIT') {
            bucket.payableIncrements = bucket.payableIncrements.add(amount);
          } else {
            bucket.payouts = bucket.payouts.add(amount);
          }
        }
      }

      if (entry.sourceType === JournalEntrySourceType.REFUND_SUCCEEDED) {
        const metadata = this.toJson(entry.metadataJson);
        bucket.refunds = bucket.refunds.add(
          this.toMoney(metadata['refundAmount']),
        );
      }
    }

    const feesTotal = gatewayFees
      .add(transferFees)
      .sub(transferFeeRecoveryRevenue);

    const recentEvents = recentJournalEntries.map((entry) => {
      const metadata = this.toJson(entry.metadataJson);
      const amountFromMetadata = this.toMoney(metadata['amountTotal'])
        .add(this.toMoney(metadata['refundAmount']))
        .add(this.toMoney(metadata['amountPaid']));
      const amount = amountFromMetadata.gt(0)
        ? amountFromMetadata
        : entry.lines.reduce((sum, line) => {
            if (line.direction === 'DEBIT') {
              return sum.add(line.amount);
            }
            return sum;
          }, new Prisma.Decimal(0));

      return {
        journalEntryId: entry.id,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        occurredAt: entry.occurredAt.toISOString(),
        currencyCode: entry.currencyCode,
        amount: amount.toFixed(2),
        summary: this.summaryLabel(entry.sourceType),
      };
    });

    const trends = this.buildDateBuckets(from, to).map((date) => {
      const bucket = trendMap.get(date) ?? {
        revenue: new Prisma.Decimal(0),
        payableIncrements: new Prisma.Decimal(0),
        payouts: new Prisma.Decimal(0),
        refunds: new Prisma.Decimal(0),
        fees: new Prisma.Decimal(0),
      };
      return {
        date,
        revenue: bucket.revenue.toFixed(2),
        payableIncrements: bucket.payableIncrements.toFixed(2),
        payouts: bucket.payouts.toFixed(2),
        refunds: bucket.refunds.toFixed(2),
        fees: bucket.fees.toFixed(2),
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      currencyCode: currencyCode ?? null,
      kpis: {
        grossInflow: grossInflow.toFixed(2),
        platformRevenue: platformRevenue.toFixed(2),
        practitionerPayableOutstanding:
          practitionerPayableOutstanding.toFixed(2),
        refundsTotal: refundsTotal.toFixed(2),
        vatTotal: vatTotal.toFixed(2),
        feesTotal: feesTotal.toFixed(2),
        currencyCode: currencyCode ?? null,
      },
      trends,
      recentEvents,
    };
  }

  private toJson(
    value: Prisma.JsonValue | null | undefined,
  ): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private toMoney(value: unknown) {
    if (typeof value === 'number') {
      return new Prisma.Decimal(value).toDecimalPlaces(2);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return new Prisma.Decimal(value).toDecimalPlaces(2);
    }
    return new Prisma.Decimal(0);
  }

  private summaryLabel(sourceType: JournalEntrySourceType) {
    switch (sourceType) {
      case JournalEntrySourceType.PAYMENT_CAPTURED:
        return 'Payment captured';
      case JournalEntrySourceType.REFUND_SUCCEEDED:
        return 'Refund succeeded';
      case JournalEntrySourceType.PRACTITIONER_PAYOUT:
        return 'Practitioner payout';
      default:
        return sourceType;
    }
  }

  private toDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private getOrCreateTrendBucket(
    map: Map<
      string,
      {
        revenue: Prisma.Decimal;
        payableIncrements: Prisma.Decimal;
        payouts: Prisma.Decimal;
        refunds: Prisma.Decimal;
        fees: Prisma.Decimal;
      }
    >,
    occurredAt: Date,
  ) {
    const key = this.toDateKey(occurredAt);
    const existing = map.get(key);
    if (existing) {
      return existing;
    }
    const created = {
      revenue: new Prisma.Decimal(0),
      payableIncrements: new Prisma.Decimal(0),
      payouts: new Prisma.Decimal(0),
      refunds: new Prisma.Decimal(0),
      fees: new Prisma.Decimal(0),
    };
    map.set(key, created);
    return created;
  }

  private buildDateBuckets(from: Date, to: Date) {
    const start = new Date(from);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setUTCHours(0, 0, 0, 0);

    const days: string[] = [];
    for (
      let cursor = start;
      cursor <= end;
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    ) {
      days.push(this.toDateKey(cursor));
    }
    return days;
  }
}
