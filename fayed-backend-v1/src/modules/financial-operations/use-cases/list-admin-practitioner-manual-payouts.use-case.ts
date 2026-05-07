import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { PractitionerManualPayoutRepository } from '../repositories/practitioner-manual-payout.repository';
import { buildPagination } from '../utils/pagination';
import { ListAdminPractitionerManualPayoutsDto } from '../dto/admin-practitioner-payouts.dto';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class ListAdminPractitionerManualPayoutsUseCase {
  constructor(
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly manualPayoutRepository: PractitionerManualPayoutRepository,
    private readonly mapper: FinancialOperationsMapper,
  ) {}

  async execute(input: {
    practitionerId?: string;
    query: ListAdminPractitionerManualPayoutsDto;
  }) {
    const practitionerId = input.practitionerId ?? input.query.practitionerId;
    let practitioner: Awaited<
      ReturnType<FinancialOperationsPractitionerRepository['findById']>
    > = null;

    if (practitionerId) {
      practitioner = await this.practitionerRepository.findById(practitionerId);
      if (!practitioner) {
        throw new NotFoundException({
          messageKey: 'financialOperations.errors.practitionerNotFound',
          error: 'FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND',
        });
      }
    }

    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const currencyCode = input.query.currency?.trim().toUpperCase();
    const createdFrom = input.query.createdFrom
      ? new Date(input.query.createdFrom)
      : undefined;
    const createdTo = input.query.createdTo
      ? new Date(input.query.createdTo)
      : undefined;

    if (currencyCode && currencyCode.length !== 3) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const [items, totalItems] = await this.manualPayoutRepository.listPayouts({
      practitionerId,
      currencyCode,
      payoutMethod: input.query.payoutMethod,
      createdFrom,
      createdTo,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((item) => this.mapper.toPractitionerManualPayout(item)),
      pagination: buildPagination({ page, limit, totalItems }),
    };
  }
}
