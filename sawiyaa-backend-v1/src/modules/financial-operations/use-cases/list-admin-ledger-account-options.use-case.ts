import { Injectable } from '@nestjs/common';
import { AccountingReadRepository } from '../repositories/accounting-read.repository';
import { LedgerAccountFilterOptionViewModel } from '../types/accounting-read.types';

@Injectable()
export class ListAdminLedgerAccountOptionsUseCase {
  constructor(
    private readonly accountingReadRepository: AccountingReadRepository,
  ) {}

  async execute(query: {
    currencyCode?: string;
  }): Promise<LedgerAccountFilterOptionViewModel[]> {
    const currencyCode = query.currencyCode?.trim().toUpperCase();
    const rows =
      await this.accountingReadRepository.listLedgerAccountOptions(
        currencyCode,
      );

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      accountType: row.accountType,
      scope: row.scope,
      currencyCode: row.currencyCode,
      practitionerId: row.practitionerId ?? null,
    }));
  }
}
