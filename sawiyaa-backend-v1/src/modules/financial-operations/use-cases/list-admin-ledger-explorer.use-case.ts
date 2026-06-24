import { BadRequestException, Injectable } from '@nestjs/common';
import { ListAdminLedgerExplorerDto } from '../dto/list-admin-ledger-explorer.dto';
import { AccountingReadRepository } from '../repositories/accounting-read.repository';
import { LedgerExplorerResultViewModel } from '../types/accounting-read.types';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class ListAdminLedgerExplorerUseCase {
  constructor(
    private readonly accountingReadRepository: AccountingReadRepository,
  ) {}

  async execute(
    query: ListAdminLedgerExplorerDto,
  ): Promise<LedgerExplorerResultViewModel> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const currencyCode = query.currencyCode?.trim().toUpperCase();
    const [items, totalItems] =
      await this.accountingReadRepository.listLedgerLines({
        page,
        limit,
        from,
        to,
        ledgerAccountId: query.ledgerAccountId,
        sourceType: query.sourceType,
        practitionerId: query.practitionerId,
        currencyCode,
        journalEntryId: query.journalEntryId,
        query: query.query?.trim() || undefined,
      });

    return {
      items: items.map((item) => ({
        id: item.id,
        journalEntryId: item.journalEntryId,
        sourceType: item.journalEntry.sourceType,
        sourceId: item.journalEntry.sourceId,
        occurredAt: item.journalEntry.occurredAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        currencyCode: item.journalEntry.currencyCode,
        ledgerAccountId: item.ledgerAccountId,
        ledgerAccountCode: item.ledgerAccount.code,
        ledgerAccountName: item.ledgerAccount.name,
        ledgerAccountScope: item.ledgerAccount.scope,
        practitionerId: item.ledgerAccount.practitionerId ?? null,
        direction: item.direction,
        amount: item.amount.toFixed(2),
        memo: item.memo ?? null,
        referenceType: item.referenceType ?? null,
        referenceId: item.referenceId ?? null,
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
      filters: {
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
        ledgerAccountId: query.ledgerAccountId ?? null,
        sourceType: query.sourceType ?? null,
        practitionerId: query.practitionerId ?? null,
        currencyCode: currencyCode ?? null,
        journalEntryId: query.journalEntryId ?? null,
        query: query.query?.trim() || null,
      },
    };
  }
}
