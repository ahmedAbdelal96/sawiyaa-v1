import { JournalEntrySourceType } from '@prisma/client';
import {
  PaymentsRevenueReportOverview,
  PaymentsRevenueReportRow,
} from '../types/payments-revenue-report.types';

export type PaymentsRevenueReportOverviewInput = {
  from: Date;
  to: Date;
  currencyCode?: string;
};

export type PaymentsRevenueReportRowsInput = PaymentsRevenueReportOverviewInput & {
  page: number;
  limit: number;
  sourceType?: JournalEntrySourceType;
};

export interface PaymentsRevenueReportProvider {
  getOverview(input: PaymentsRevenueReportOverviewInput): Promise<PaymentsRevenueReportOverview>;
  listRows(
    input: PaymentsRevenueReportRowsInput,
  ): Promise<{ items: PaymentsRevenueReportRow[]; totalItems: number }>;
}

export const PAYMENTS_REVENUE_REPORT_PROVIDER = Symbol(
  'PAYMENTS_REVENUE_REPORT_PROVIDER',
);

