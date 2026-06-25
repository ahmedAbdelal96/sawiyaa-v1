import {
  PayoutsReportOverview,
  PayoutsReportRow,
} from '../types/payouts-report.types';

export type PayoutsReportOverviewInput = {
  from: Date;
  to: Date;
  currencyCode?: string;
  practitionerId?: string;
};

export type PayoutsReportRowsInput = PayoutsReportOverviewInput & {
  page: number;
  limit: number;
};

export interface PayoutsReportProvider {
  getOverview(
    input: PayoutsReportOverviewInput,
  ): Promise<PayoutsReportOverview>;
  listRows(
    input: PayoutsReportRowsInput,
  ): Promise<{ items: PayoutsReportRow[]; totalItems: number }>;
}

export const PAYOUTS_REPORT_PROVIDER = Symbol('PAYOUTS_REPORT_PROVIDER');
