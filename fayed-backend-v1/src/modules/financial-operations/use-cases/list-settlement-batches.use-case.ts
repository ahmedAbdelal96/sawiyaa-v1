import { BadRequestException, Injectable } from '@nestjs/common';
import { ListSettlementBatchesDto } from '../dto/list-practitioner-ledger.dto';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { SettlementRepository } from '../repositories/settlement.repository';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class ListSettlementBatchesUseCase {
  constructor(
    private readonly settlementRepository: SettlementRepository,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(query: ListSettlementBatchesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const createdFrom = query.createdFrom
      ? new Date(query.createdFrom)
      : undefined;
    const createdTo = query.createdTo ? new Date(query.createdTo) : undefined;

    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const [items, totalItems] =
      await this.settlementRepository.listSettlementBatches({
        currencyCode: query.currencyCode?.trim().toUpperCase(),
        status: query.status,
        periodYear: query.periodYear,
        periodMonth: query.periodMonth,
        createdFrom,
        createdTo,
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      items: items.map((item) =>
        this.financialOperationsMapper.toSettlementBatchListItem(item),
      ),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }
}
