import { JournalEntrySourceType, LedgerDirection } from '@prisma/client';

export type AccountingKpiSnapshotViewModel = {
  grossInflow: string;
  platformRevenue: string;
  practitionerPayableOutstanding: string;
  refundsTotal: string;
  vatTotal: string;
  feesTotal: string;
  currencyCode: string | null;
};

export type AccountingTrendPointViewModel = {
  date: string;
  revenue: string;
  payableIncrements: string;
  payouts: string;
  refunds: string;
  fees: string;
};

export type AccountingRecentEventViewModel = {
  journalEntryId: string;
  sourceType: JournalEntrySourceType;
  sourceId: string;
  occurredAt: string;
  currencyCode: string;
  amount: string;
  summary: string;
};

export type AccountingDashboardViewModel = {
  generatedAt: string;
  range: {
    from: string;
    to: string;
  };
  currencyCode: string | null;
  kpis: AccountingKpiSnapshotViewModel;
  trends: AccountingTrendPointViewModel[];
  recentEvents: AccountingRecentEventViewModel[];
};

export type LedgerAccountFilterOptionViewModel = {
  id: string;
  code: string;
  name: string;
  accountType: string;
  scope: string;
  currencyCode: string;
  practitionerId: string | null;
};

export type LedgerExplorerRowViewModel = {
  id: string;
  journalEntryId: string;
  sourceType: JournalEntrySourceType;
  sourceId: string;
  occurredAt: string;
  createdAt: string;
  currencyCode: string;
  ledgerAccountId: string;
  ledgerAccountCode: string;
  ledgerAccountName: string;
  ledgerAccountScope: string;
  practitionerId: string | null;
  direction: LedgerDirection;
  amount: string;
  memo: string | null;
  referenceType: string | null;
  referenceId: string | null;
};

export type LedgerExplorerFiltersViewModel = {
  from: string | null;
  to: string | null;
  ledgerAccountId: string | null;
  sourceType: JournalEntrySourceType | null;
  practitionerId: string | null;
  currencyCode: string | null;
  journalEntryId: string | null;
  query: string | null;
};

export type LedgerExplorerResultViewModel = {
  items: LedgerExplorerRowViewModel[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  filters: LedgerExplorerFiltersViewModel;
};

export type JournalEntryDetailViewModel = {
  id: string;
  sourceType: JournalEntrySourceType;
  sourceId: string;
  occurredAt: string;
  createdAt: string;
  currencyCode: string;
  description: string | null;
  lines: LedgerExplorerRowViewModel[];
};
