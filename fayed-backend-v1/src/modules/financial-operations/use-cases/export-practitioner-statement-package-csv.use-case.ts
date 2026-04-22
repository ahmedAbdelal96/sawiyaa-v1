import { Injectable } from '@nestjs/common';
import { ListPractitionerStatementDto } from '../dto/practitioner-statement.dto';
import { GetPractitionerStatementUseCase } from './get-practitioner-statement.use-case';
import { toCsvContent } from '../utils/csv.util';

@Injectable()
export class ExportPractitionerStatementPackageCsvUseCase {
  constructor(
    private readonly getPractitionerStatementUseCase: GetPractitionerStatementUseCase,
  ) {}

  async execute(input: {
    practitionerId: string;
    query: ListPractitionerStatementDto;
  }) {
    const statement = await this.getPractitionerStatementUseCase.execute(input);

    const rows: string[][] = [
      ['Report', 'Practitioner finance statement package'],
      ['Generated at', statement.generatedAt],
      ['Practitioner id', statement.practitioner.id],
      ['Practitioner name', statement.practitioner.displayName ?? ''],
      ['Practitioner slug', statement.practitioner.publicSlug ?? ''],
      ['Professional title', statement.practitioner.professionalTitle ?? ''],
      ['Country', statement.practitioner.countryCode ?? ''],
      [],
      ['Filter currency', statement.filters.currencyCode ?? 'ALL'],
      ['Filter row type', statement.filters.rowType],
      ['Filter from', statement.filters.effectiveFrom ?? ''],
      ['Filter to', statement.filters.effectiveTo ?? ''],
      [],
      ['Summary', 'Value'],
      ['Rows', String(statement.summary.rowCount)],
      ['Earning rows', String(statement.summary.earningRowsCount)],
      ['Payout rows', String(statement.summary.payoutRowsCount)],
      ['Earning total', statement.summary.earningTotal],
      ['Payout total', statement.summary.payoutTotal],
      ['Net total', statement.summary.netTotal],
      ['First activity at', statement.summary.firstActivityAt ?? ''],
      ['Last activity at', statement.summary.lastActivityAt ?? ''],
      [],
      ['Currency summaries'],
      ['Currency', 'Rows', 'Earning rows', 'Payout rows', 'Earning total', 'Payout total', 'Net total'],
      ...statement.summary.currencySummaries.map((item) => [
        item.currency,
        String(item.rowCount),
        String(item.earningRowsCount),
        String(item.payoutRowsCount),
        item.earningTotal,
        item.payoutTotal,
        item.netTotal,
      ]),
      [],
      ['Wallet snapshots'],
      [
        'Currency',
        'Available balance',
        'Pending balance',
        'Reserved balance',
        'Lifetime earned',
        'Lifetime paid out',
        'Last ledger entry at',
        'Wallet updated at',
      ],
      ...statement.summary.walletSummaries.map((wallet) => [
        wallet.currency,
        wallet.availableBalance,
        wallet.pendingBalance,
        wallet.reservedBalance,
        wallet.totalEarned,
        wallet.lifetimePaidOut,
        wallet.lastLedgerEntryAt ?? '',
        wallet.updatedAt ?? '',
      ]),
      [],
      ['Statement rows'],
      [
        'Row id',
        'Row type',
        'Source type',
        'Effective at',
        'Created at',
        'Currency',
        'Amount',
        'Description',
        'Notes',
        'Payment id',
        'Session id',
        'Payout id',
        'Settlement id',
        'External reference',
        'Processed by user id',
        'Processed by display name',
      ],
      ...statement.rows.map((row) => [
        row.id,
        row.rowType,
        row.sourceType,
        row.effectiveAt,
        row.createdAt,
        row.currency,
        row.amount,
        row.description ?? '',
        row.notes ?? '',
        row.paymentId ?? '',
        row.sessionId ?? '',
        row.sourceType === 'PAYOUT' ? (row.referenceId ?? '') : '',
        row.settlementId ?? '',
        row.externalReference ?? '',
        row.processedByUserId ?? '',
        row.processedByDisplayName ?? '',
      ]),
    ];

    const content = toCsvContent(rows);
    const fromDate = statement.filters.effectiveFrom?.slice(0, 10) ?? 'start';
    const toDate = statement.filters.effectiveTo?.slice(0, 10) ?? 'now';
    const fileName = `practitioner-statement-package-${statement.practitioner.id}-${fromDate}-to-${toDate}.csv`;

    return {
      content,
      fileName,
    };
  }
}
