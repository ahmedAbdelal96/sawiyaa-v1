import { Injectable } from '@nestjs/common';
import {
  JournalEntrySourceType,
  LedgerDirection,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PLATFORM_LEDGER_ACCOUNT_CODES } from '@modules/financial-operations/types/accounting.types';
import { buildDailyBuckets, toUtcDateKey } from '../utils/report-date.util';
import {
  PaymentsRevenueReportOverviewInput,
  PaymentsRevenueReportProvider,
  PaymentsRevenueReportRowsInput,
} from './payments-revenue-report.provider';
import {
  PaymentsRevenueReportOverview,
  PaymentsRevenueReportRow,
} from '../types/payments-revenue-report.types';

@Injectable()
export class PrismaPaymentsRevenueReportProvider
  implements PaymentsRevenueReportProvider
{
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    input: PaymentsRevenueReportOverviewInput,
  ): Promise<PaymentsRevenueReportOverview> {
    const currencyCode = input.currencyCode?.trim().toUpperCase();

    const [journalEntries, practitionerLiabilityLines] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where: {
          occurredAt: { gte: input.from, lte: input.to },
          currencyCode: currencyCode || undefined,
        },
        include: {
          lines: {
            include: {
              ledgerAccount: {
                select: { code: true, scope: true, accountType: true },
              },
            },
          },
        },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: 250,
      }),
      this.prisma.journalLine.findMany({
        where: {
          ledgerAccount: {
            scope: 'PRACTITIONER',
            accountType: 'LIABILITY',
            currencyCode: currencyCode || undefined,
          },
          journalEntry: {
            occurredAt: { lte: input.to },
            currencyCode: currencyCode || undefined,
          },
        },
        select: { direction: true, amount: true },
      }),
    ]);

    const grossInflow = journalEntries
      .filter((entry) => entry.sourceType === JournalEntrySourceType.PAYMENT_CAPTURED)
      .reduce((sum, entry) => sum.add(this.toMoney(this.toJson(entry.metadataJson)['amountTotal'])), new Prisma.Decimal(0));

    const refundsTotal = journalEntries
      .filter((entry) => entry.sourceType === JournalEntrySourceType.REFUND_SUCCEEDED)
      .reduce((sum, entry) => sum.add(this.toMoney(this.toJson(entry.metadataJson)['refundAmount'])), new Prisma.Decimal(0));

    let platformRevenue = new Prisma.Decimal(0);
    let vatTotal = new Prisma.Decimal(0);
    let gatewayFees = new Prisma.Decimal(0);
    let transferFees = new Prisma.Decimal(0);
    let transferFeeRecoveryRevenue = new Prisma.Decimal(0);

    const practitionerPayableOutstanding = practitionerLiabilityLines.reduce(
      (sum, line) =>
        line.direction === LedgerDirection.CREDIT ? sum.add(line.amount) : sum.sub(line.amount),
      new Prisma.Decimal(0),
    );

    const trendMap = new Map<
      string,
      { grossInflow: Prisma.Decimal; revenue: Prisma.Decimal; refunds: Prisma.Decimal; fees: Prisma.Decimal }
    >();

    for (const entry of journalEntries) {
      const bucketKey = toUtcDateKey(entry.occurredAt);
      const bucket =
        trendMap.get(bucketKey) ??
        {
          grossInflow: new Prisma.Decimal(0),
          revenue: new Prisma.Decimal(0),
          refunds: new Prisma.Decimal(0),
          fees: new Prisma.Decimal(0),
        };

      if (entry.sourceType === JournalEntrySourceType.PAYMENT_CAPTURED) {
        bucket.grossInflow = bucket.grossInflow.add(
          this.toMoney(this.toJson(entry.metadataJson)['amountTotal']),
        );
      }

      if (entry.sourceType === JournalEntrySourceType.REFUND_SUCCEEDED) {
        bucket.refunds = bucket.refunds.add(
          this.toMoney(this.toJson(entry.metadataJson)['refundAmount']),
        );
      }

      for (const line of entry.lines) {
        const code = line.ledgerAccount.code;
        const amount = line.amount;
        const signed = line.direction === LedgerDirection.CREDIT ? amount : amount.neg();

        if (code === PLATFORM_LEDGER_ACCOUNT_CODES.platformRevenue) {
          platformRevenue = platformRevenue.add(signed);
          bucket.revenue = bucket.revenue.add(signed);
        }

        if (code === PLATFORM_LEDGER_ACCOUNT_CODES.vatPayable) {
          vatTotal = vatTotal.add(signed);
        }

        if (code === PLATFORM_LEDGER_ACCOUNT_CODES.gatewayFeesExpense) {
          if (line.direction === LedgerDirection.DEBIT) {
            gatewayFees = gatewayFees.add(amount);
            bucket.fees = bucket.fees.add(amount);
          }
        }

        if (code === PLATFORM_LEDGER_ACCOUNT_CODES.transferFeesExpense) {
          if (line.direction === LedgerDirection.DEBIT) {
            transferFees = transferFees.add(amount);
            bucket.fees = bucket.fees.add(amount);
          }
        }

        if (code === PLATFORM_LEDGER_ACCOUNT_CODES.transferFeeRecoveryRevenue) {
          // Recovery is revenue (credit). We subtract it from fees so fees reflect net.
          transferFeeRecoveryRevenue =
            line.direction === LedgerDirection.CREDIT
              ? transferFeeRecoveryRevenue.add(amount)
              : transferFeeRecoveryRevenue.sub(amount);
        }
      }

      trendMap.set(bucketKey, bucket);
    }

    const feesTotal = gatewayFees.add(transferFees).sub(transferFeeRecoveryRevenue);
    const dailyKeys = buildDailyBuckets(input.from, input.to);

    const trend = dailyKeys.map((date) => {
      const bucket =
        trendMap.get(date) ??
        {
          grossInflow: new Prisma.Decimal(0),
          revenue: new Prisma.Decimal(0),
          refunds: new Prisma.Decimal(0),
          fees: new Prisma.Decimal(0),
        };
      return {
        date,
        grossInflow: bucket.grossInflow.toFixed(2),
        revenue: bucket.revenue.toFixed(2),
        refunds: bucket.refunds.toFixed(2),
        fees: bucket.fees.toFixed(2),
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      range: { from: input.from.toISOString(), to: input.to.toISOString() },
      currencyCode: currencyCode ?? null,
      kpis: {
        grossInflow: grossInflow.toFixed(2),
        refundsTotal: refundsTotal.toFixed(2),
        platformRevenue: platformRevenue.toFixed(2),
        practitionerPayableOutstanding: practitionerPayableOutstanding.toFixed(2),
        vatTotal: vatTotal.toFixed(2),
        feesTotal: feesTotal.toFixed(2),
      },
      trend,
    };
  }

  async listRows(input: PaymentsRevenueReportRowsInput) {
    const currencyCode = input.currencyCode?.trim().toUpperCase();
    const where: Prisma.JournalEntryWhereInput = {
      occurredAt: { gte: input.from, lte: input.to },
      currencyCode: currencyCode || undefined,
      sourceType: input.sourceType,
    };

    const skip = (input.page - 1) * input.limit;
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            select: {
              direction: true,
              amount: true,
            },
          },
        },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: input.limit,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    const items: PaymentsRevenueReportRow[] = rows.map((entry) => {
      const metadata = this.toJson(entry.metadataJson);
      const amountFromMetadata = this.toMoney(metadata['amountTotal'])
        .add(this.toMoney(metadata['refundAmount']))
        .add(this.toMoney(metadata['amountPaid']));

      const amount =
        amountFromMetadata.gt(0)
          ? amountFromMetadata
          : entry.lines.reduce((sum, line) => {
              if (line.direction === LedgerDirection.DEBIT) {
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

    return { items, totalItems };
  }

  private toJson(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
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
        return 'Payment collected';
      case JournalEntrySourceType.REFUND_SUCCEEDED:
        return 'Refund processed';
      case JournalEntrySourceType.PRACTITIONER_PAYOUT:
        return 'Practitioner payout';
      default:
        return 'Finance event';
    }
  }
}

