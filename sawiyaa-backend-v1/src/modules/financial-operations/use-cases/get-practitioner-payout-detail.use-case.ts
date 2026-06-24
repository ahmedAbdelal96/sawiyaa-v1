import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class GetPractitionerPayoutDetailUseCase {
  constructor(
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly settlementPayoutRepository: SettlementPayoutRepository,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: { practitionerId: string; payoutId: string }) {
    const practitioner = await this.practitionerRepository.findById(
      input.practitionerId,
    );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerNotFound',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND',
      });
    }

    const payout =
      await this.settlementPayoutRepository.findSettlementPayoutForPractitioner(
        practitioner.id,
        input.payoutId,
      );

    if (!payout) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.settlementPayoutNotFound',
        error: FINANCIAL_OPS_ERROR_CODES.settlementPayoutNotFound,
      });
    }

    return {
      item: this.financialOperationsMapper.toPractitionerPayoutDetail(payout),
    };
  }
}
