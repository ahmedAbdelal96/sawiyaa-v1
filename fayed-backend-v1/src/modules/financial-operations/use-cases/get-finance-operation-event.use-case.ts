import { Injectable, NotFoundException } from '@nestjs/common';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class GetFinanceOperationEventUseCase {
  constructor(
    private readonly financialOperationsPaymentRepository: FinancialOperationsPaymentRepository,
  ) {}

  async execute(eventId: string) {
    const event =
      await this.financialOperationsPaymentRepository.findFinanceOperationEventById(eventId);

    if (!event) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.resourceNotFoundInScope',
        error: FINANCIAL_OPS_ERROR_CODES.resourceNotFoundInScope,
        eventId,
      });
    }

    return {
      item: {
        ...event,
        occurredAt: event.occurredAt.toISOString(),
        createdAt: event.createdAt.toISOString(),
      },
    };
  }

}
