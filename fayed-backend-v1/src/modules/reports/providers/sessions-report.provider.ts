import { Prisma } from '@prisma/client';
import { SessionsReportOverview, SessionsReportRow } from '../types/sessions-report.types';

export type SessionsReportOverviewInput = {
  from: Date;
  to: Date;
};

export type SessionsReportRowsInput = {
  from: Date;
  to: Date;
  page: number;
  limit: number;
  status?: string;
};

export interface SessionsReportProvider {
  getOverview(input: SessionsReportOverviewInput): Promise<SessionsReportOverview>;
  listRows(
    input: SessionsReportRowsInput,
  ): Promise<{
    items: SessionsReportRow[];
    totalItems: number;
  }>;
}

export const SESSIONS_REPORT_PROVIDER = Symbol('SESSIONS_REPORT_PROVIDER');

export function toMoney(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value).toDecimalPlaces(2).toFixed(2);
}

