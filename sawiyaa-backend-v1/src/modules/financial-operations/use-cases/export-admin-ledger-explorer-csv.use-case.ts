import { Injectable } from '@nestjs/common';
import { ExportAdminLedgerExplorerDto } from '../dto/export-admin-ledger-explorer.dto';
import { ListAdminLedgerExplorerUseCase } from './list-admin-ledger-explorer.use-case';
import { toCsvContent } from '../utils/csv.util';

const LEDGER_CHUNK_LIMIT = 50;

@Injectable()
export class ExportAdminLedgerExplorerCsvUseCase {
  constructor(
    private readonly listAdminLedgerExplorerUseCase: ListAdminLedgerExplorerUseCase,
  ) {}

  async execute(query: ExportAdminLedgerExplorerDto) {
    const exportLimit = query.exportLimit ?? 2000;
    const rows: Array<{
      id: string;
      journalEntryId: string;
      sourceType: string;
      sourceId: string;
      occurredAt: string;
      createdAt: string;
      currencyCode: string;
      ledgerAccountCode: string;
      ledgerAccountName: string;
      ledgerAccountScope: string;
      practitionerId: string | null;
      direction: string;
      amount: string;
      memo: string | null;
      referenceType: string | null;
      referenceId: string | null;
    }> = [];

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && rows.length < exportLimit) {
      const current = await this.listAdminLedgerExplorerUseCase.execute({
        ...query,
        page,
        limit: LEDGER_CHUNK_LIMIT,
      });
      totalPages = current.pagination.totalPages;

      for (const item of current.items) {
        rows.push(item);
        if (rows.length >= exportLimit) {
          break;
        }
      }
      page += 1;
    }

    const filteredRows = rows.slice(0, exportLimit);
    const content = toCsvContent([
      ['Report', 'Admin ledger explorer export'],
      ['Generated at', new Date().toISOString()],
      ['From', query.from ?? ''],
      ['To', query.to ?? ''],
      ['Source type', query.sourceType ?? ''],
      ['Practitioner id', query.practitionerId ?? ''],
      ['Ledger account id', query.ledgerAccountId ?? ''],
      ['Currency', query.currencyCode ?? ''],
      ['Journal entry id', query.journalEntryId ?? ''],
      ['Query', query.query ?? ''],
      ['Export row limit', String(exportLimit)],
      ['Exported rows', String(filteredRows.length)],
      [],
      [
        'Line id',
        'Journal entry id',
        'Source type',
        'Source id',
        'Occurred at',
        'Created at',
        'Currency',
        'Account code',
        'Account name',
        'Account scope',
        'Practitioner id',
        'Direction',
        'Amount',
        'Reference type',
        'Reference id',
        'Memo',
      ],
      ...filteredRows.map((item) => [
        item.id,
        item.journalEntryId,
        item.sourceType,
        item.sourceId,
        item.occurredAt,
        item.createdAt,
        item.currencyCode,
        item.ledgerAccountCode,
        item.ledgerAccountName,
        item.ledgerAccountScope,
        item.practitionerId ?? '',
        item.direction,
        item.amount,
        item.referenceType ?? '',
        item.referenceId ?? '',
        item.memo ?? '',
      ]),
    ]);

    const fromDate = query.from?.slice(0, 10) ?? 'any';
    const toDate = query.to?.slice(0, 10) ?? 'any';
    const fileName = `admin-ledger-export-${fromDate}-to-${toDate}.csv`;

    return {
      content,
      fileName,
      exportedRows: filteredRows.length,
      requestedLimit: exportLimit,
    };
  }
}
