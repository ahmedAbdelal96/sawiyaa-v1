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

    const createdFrom = input.query.createdFrom ? new Date(input.query.createdFrom) : undefined;
    const createdTo = input.query.createdTo ? new Date(input.query.createdTo) : undefined;

    const [items, totalItems] = await this.settlementPayoutRepository.listSettlementPayouts({
      practitionerId: input.query.practitionerId,
      payoutMethod: input.query.payoutMethod,
      currencyCode: input.query.currencyCode,
      createdFrom,
      createdTo,
      skip,
      take: limit,
    });

    return {
      success: true as const,
      data: {
        items: items.map((item) => this.mapper.toAdminPayoutHistory(item)),
        pagination: buildPagination({ page, limit, totalItems }),
      },
    };
  }
}

