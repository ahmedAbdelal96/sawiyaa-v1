import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { PractitionerManualPayoutBalanceService } from '../services/practitioner-manual-payout-balance.service';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class GetAdminPractitionerPayoutBalanceUseCase {
  constructor(
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly balanceService: PractitionerManualPayoutBalanceService,
  ) {}

  async execute(input: { practitionerId: string; currency?: string }) {
    const practitioner = await this.practitionerRepository.findById(
      input.practitionerId,
    );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerNotFound',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND',
      });
    }

    const currency = input.currency?.trim().toUpperCase();
    if (!currency || currency.length !== 3) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const item = await this.balanceService.getBalance({
      practitionerId: practitioner.id,
      currencyCode: currency,
    });

    return {
      item,
    };
  }
}
