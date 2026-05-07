import { BadRequestException, Injectable } from '@nestjs/common';
import { PackageSettlementStatus } from '@prisma/client';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { PackageSettlementRepository } from '../repositories/package-settlement.repository';
import { ListPackageSettlementsDto } from '../dto/list-package-settlements.dto';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class ListAdminPackageSettlementsUseCase {
  constructor(
    private readonly packageSettlementRepository: PackageSettlementRepository,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: { query: ListPackageSettlementsDto }) {
    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const createdFrom = input.query.createdFrom
      ? new Date(input.query.createdFrom)
      : undefined;
    const createdTo = input.query.createdTo
      ? new Date(input.query.createdTo)
      : undefined;

    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const [items, totalItems] =
      await this.packageSettlementRepository.listPackageSettlements({
        status: input.query.status as PackageSettlementStatus | undefined,
        currencyCode: input.query.currencyCode?.trim().toUpperCase(),
        createdFrom,
        createdTo,
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      items: items.map((item) =>
        this.financialOperationsMapper.toPackageSettlement(item),
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
