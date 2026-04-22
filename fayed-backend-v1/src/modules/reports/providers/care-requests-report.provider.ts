import { ChatApprovalStatus, Prisma } from '@prisma/client';
import { CareRequestsReportOverview, CareRequestsReportRow } from '../types/care-requests-report.types';

export type CareRequestsReportOverviewInput = {
  from: Date;
  to: Date;
  practitionerId?: string;
};

export type CareRequestsReportRowsInput = CareRequestsReportOverviewInput & {
  page: number;
  limit: number;
  status?: ChatApprovalStatus;
};

export interface CareRequestsReportProvider {
  getOverview(input: CareRequestsReportOverviewInput): Promise<CareRequestsReportOverview>;
  listRows(input: CareRequestsReportRowsInput): Promise<{ items: CareRequestsReportRow[]; totalItems: number }>;
}

export const CARE_REQUESTS_REPORT_PROVIDER = Symbol('CARE_REQUESTS_REPORT_PROVIDER');

export function toDecimal(value: number | string) {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

