import { SupportTicketStatus } from '@prisma/client';
import { SupportReportOverview, SupportReportRow } from '../types/support-report.types';

export type SupportReportOverviewInput = {
  from: Date;
  to: Date;
};

export type SupportReportRowsInput = SupportReportOverviewInput & {
  page: number;
  limit: number;
  status?: SupportTicketStatus;
};

export interface SupportReportProvider {
  getOverview(input: SupportReportOverviewInput): Promise<SupportReportOverview>;
  listRows(input: SupportReportRowsInput): Promise<{ items: SupportReportRow[]; totalItems: number }>;
}

export const SUPPORT_REPORT_PROVIDER = Symbol('SUPPORT_REPORT_PROVIDER');

