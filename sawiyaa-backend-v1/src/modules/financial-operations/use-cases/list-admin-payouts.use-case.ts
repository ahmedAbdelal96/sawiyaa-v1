import { Injectable } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { buildPagination } from '../utils/pagination';
import type { ListAdminPayoutsDto } from '../dto/admin-payouts.dto';

@Injectable()
export class ListAdminPayoutsUseCase {
  constructor(
    private readonly settlementPayoutRepository: SettlementPayoutRepository,
    private readonly mapper: FinancialOperationsMapper,
  ) {}

  async execute(input: { query: ListAdminPayoutsDto }) {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const skip = (page - 1) * limit;

    const createdFrom = input.query.createdFrom
      ? new Date(input.query.createdFrom)
      : undefined;
    const createdTo = input.query.createdTo
      ? new Date(input.query.createdTo)
      : undefined;
    if (createdTo && /^\d{4}-\d{2}-\d{2}$/.test(input.query.createdTo ?? '')) {
      createdTo.setUTCHours(23, 59, 59, 999);
    }

    const [itemsResult, summary] = await Promise.all([
      this.settlementPayoutRepository.listSettlementPayouts({
        practitionerId: input.query.practitionerId,
        payoutMethod: input.query.payoutMethod,
        currencyCode: input.query.currencyCode?.trim().toUpperCase(),
        createdFrom,
        createdTo,
        skip,
        take: limit,
      }),
      this.settlementPayoutRepository.summarizeSettlementPayouts({
        practitionerId: input.query.practitionerId,
        payoutMethod: input.query.payoutMethod,
        currencyCode: input.query.currencyCode?.trim().toUpperCase(),
        createdFrom,
        createdTo,
      }),
    ]);

    const [items, totalItems] = itemsResult;

    return {
      success: true as const,
      data: {
        items: items.map((item) => this.mapper.toAdminPayoutHistory(item)),
        pagination: buildPagination({ page, limit, totalItems }),
        summary,
      },
    };
  }
}
