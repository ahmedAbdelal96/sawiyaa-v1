import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountingReadRepository } from '../repositories/accounting-read.repository';
import { JournalEntryDetailViewModel } from '../types/accounting-read.types';

@Injectable()
export class GetAdminLedgerJournalEntryUseCase {
  constructor(
    private readonly accountingReadRepository: AccountingReadRepository,
  ) {}

  async execute(journalEntryId: string): Promise<JournalEntryDetailViewModel> {
    const journal =
      await this.accountingReadRepository.getJournalEntryWithLines(
        journalEntryId,
      );

    if (!journal) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.resourceNotFoundInScope',
        error: 'FINANCIAL_OPERATIONS_JOURNAL_ENTRY_NOT_FOUND',
      });
    }

    return {
      id: journal.id,
      sourceType: journal.sourceType,
      sourceId: journal.sourceId,
      occurredAt: journal.occurredAt.toISOString(),
      createdAt: journal.createdAt.toISOString(),
      currencyCode: journal.currencyCode,
      description: journal.description ?? null,
      lines: journal.lines.map((line) => ({
        id: line.id,
        journalEntryId: line.journalEntryId,
        sourceType: journal.sourceType,
        sourceId: journal.sourceId,
        occurredAt: journal.occurredAt.toISOString(),
        createdAt: line.createdAt.toISOString(),
        currencyCode: journal.currencyCode,
        ledgerAccountId: line.ledgerAccountId,
        ledgerAccountCode: line.ledgerAccount.code,
        ledgerAccountName: line.ledgerAccount.name,
        ledgerAccountScope: line.ledgerAccount.scope,
        practitionerId: line.ledgerAccount.practitionerId ?? null,
        direction: line.direction,
        amount: line.amount.toFixed(2),
        memo: line.memo ?? null,
        referenceType: line.referenceType ?? null,
        referenceId: line.referenceId ?? null,
      })),
    };
  }
}
