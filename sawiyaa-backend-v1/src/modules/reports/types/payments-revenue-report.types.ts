import { JournalEntrySourceType } from '@prisma/client';

export type PaymentsRevenueReportOverview = {
  generatedAt: string;
  range: { from: string; to: string };
  currencyCode: string | null;
  kpis: {
    grossInflow: string;
    refundsTotal: string;
    platformRevenue: string;
    practitionerPayableOutstanding: string;
    vatTotal: string;
    feesTotal: string;
  };
  trend: Array<{
    date: string;
    grossInflow: string;
    revenue: string;
    refunds: string;
    fees: string;
  }>;
};

export type PaymentsRevenueReportRow = {
  journalEntryId: string;
  sourceType: JournalEntrySourceType;
  sourceId: string;
  occurredAt: string;
  currencyCode: string;
  amount: string;
  summary: string;
};
