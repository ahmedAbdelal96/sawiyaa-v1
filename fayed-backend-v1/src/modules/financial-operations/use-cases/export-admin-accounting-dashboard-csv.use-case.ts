import { Injectable } from '@nestjs/common';
import { GetAdminAccountingDashboardDto } from '../dto/admin-accounting-dashboard.dto';
import { GetAdminAccountingDashboardUseCase } from './get-admin-accounting-dashboard.use-case';
import { toCsvContent } from '../utils/csv.util';

@Injectable()
export class ExportAdminAccountingDashboardCsvUseCase {
  constructor(
    private readonly getAdminAccountingDashboardUseCase: GetAdminAccountingDashboardUseCase,
  ) {}

  async execute(query: GetAdminAccountingDashboardDto) {
    const snapshot =
      await this.getAdminAccountingDashboardUseCase.execute(query);

    const rows: string[][] = [
      ['Report', 'Admin accounting dashboard summary'],
      ['Generated at', snapshot.generatedAt],
      ['From', snapshot.range.from],
      ['To', snapshot.range.to],
      ['Currency', snapshot.currencyCode ?? 'ALL'],
      [],
      ['KPI', 'Value'],
      ['Gross inflow', snapshot.kpis.grossInflow],
      ['Platform revenue', snapshot.kpis.platformRevenue],
      [
        'Practitioner payable outstanding',
        snapshot.kpis.practitionerPayableOutstanding,
      ],
      ['Refund total', snapshot.kpis.refundsTotal],
      ['VAT total', snapshot.kpis.vatTotal],
      ['Fees total', snapshot.kpis.feesTotal],
      [],
      [
        'Trend date',
        'Revenue',
        'Payable increments',
        'Payouts',
        'Refunds',
        'Fees',
      ],
      ...snapshot.trends.map((point) => [
        point.date,
        point.revenue,
        point.payableIncrements,
        point.payouts,
        point.refunds,
        point.fees,
      ]),
      [],
      [
        'Recent journal entry id',
        'Source type',
        'Source id',
        'Occurred at',
        'Currency',
        'Amount',
        'Summary',
      ],
      ...snapshot.recentEvents.map((event) => [
        event.journalEntryId,
        event.sourceType,
        event.sourceId,
        event.occurredAt,
        event.currencyCode,
        event.amount,
        event.summary,
      ]),
    ];

    const content = toCsvContent(rows);
    const fromDate = snapshot.range.from.slice(0, 10);
    const toDate = snapshot.range.to.slice(0, 10);
    const currencySuffix = snapshot.currencyCode ?? 'ALL';
    const fileName = `admin-accounting-dashboard-${fromDate}-to-${toDate}-${currencySuffix}.csv`;

    return {
      content,
      fileName,
    };
  }
}
