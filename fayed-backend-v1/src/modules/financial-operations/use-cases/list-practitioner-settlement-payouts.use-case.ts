import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { ListSettlementPayoutsDto } from '../dto/settlement-payout.dto';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class ListPractitionerSettlementPayoutsUseCase {
  constructor(
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly settlementPayoutRepository: SettlementPayoutRepository,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: {
    practitionerId: string;
    query: ListSettlementPayoutsDto;
  }) {
    const practitioner = await this.practitionerRepository.findById(
      input.practitionerId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerNotFound',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND',
      });
    }

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
      await this.settlementPayoutRepository.listPractitionerSettlementPayouts({
        practitionerId: practitioner.id,
        payoutMethod: input.query.payoutMethod,
        payoutSource: input.query.payoutSource,
        batchId: input.query.batchId,
        settlementId: input.query.settlementId,
        createdFrom,
        createdTo,
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      items: items.map((item) =>
        this.financialOperationsMapper.toSettlementPayout(item),
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
