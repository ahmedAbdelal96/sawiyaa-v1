import { BadRequestException, Injectable } from '@nestjs/common';
import {
  FinanceOperationSortByDto,
  FinanceOperationSortOrderDto,
  FinanceOperationTypeDto,
  ListFinanceOperationEventsDto,
} from '../dto/list-finance-operation-events.dto';
import { FinancialOperationsPaymentRepository } from '../repositories/financial-operations-payment.repository';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class ListFinanceOperationEventsUseCase {
  constructor(
    private readonly financialOperationsPaymentRepository: FinancialOperationsPaymentRepository,
  ) {}

  async execute(query: ListFinanceOperationEventsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const occurredFrom = query.occurredFrom
      ? new Date(query.occurredFrom)
      : undefined;
    const occurredTo = query.occurredTo
      ? new Date(query.occurredTo)
      : undefined;

    if (occurredFrom && occurredTo && occurredFrom > occurredTo) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    if (
      query.operationType === FinanceOperationTypeDto.PAYMENT &&
      (query.refundStatus || query.refundId)
    ) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const [items, totalItems] =
      await this.financialOperationsPaymentRepository.listFinanceOperationEvents(
        {
          operationType: query.operationType,
          provider: query.provider,
          paymentPurpose: query.paymentPurpose,
          paymentStatus: query.paymentStatus,
          refundStatus: query.refundStatus,
          paymentId: query.paymentId,
          refundId: query.refundId,
          occurredFrom,
          occurredTo,
          query: query.query?.trim() || undefined,
          sortBy: query.sortBy ?? FinanceOperationSortByDto.OCCURRED_AT,
          sortOrder: query.sortOrder ?? FinanceOperationSortOrderDto.DESC,
          page,
          limit,
        },
      );

    return {
      items: items.map((item) => ({
        ...item,
        occurredAt: item.occurredAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
      filters: {
        sortBy: query.sortBy ?? FinanceOperationSortByDto.OCCURRED_AT,
        sortOrder: query.sortOrder ?? FinanceOperationSortOrderDto.DESC,
        operationType: query.operationType ?? null,
        provider: query.provider ?? null,
        paymentPurpose: query.paymentPurpose ?? null,
        paymentStatus: query.paymentStatus ?? null,
        refundStatus: query.refundStatus ?? null,
        paymentId: query.paymentId ?? null,
        refundId: query.refundId ?? null,
        occurredFrom: occurredFrom?.toISOString() ?? null,
        occurredTo: occurredTo?.toISOString() ?? null,
        query: query.query?.trim() || null,
      },
    };
  }
}
