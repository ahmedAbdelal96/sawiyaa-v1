import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { LedgerRepository } from '../repositories/ledger.repository';
import { ListPractitionerLedgerDto } from '../dto/list-practitioner-ledger.dto';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class ListPractitionerLedgerEntriesUseCase {
  constructor(
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: { userId: string; query: ListPractitionerLedgerDto }) {
    const practitioner = await this.practitionerRepository.findByUserId(
      input.userId,
    );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'financialOperations.errors.practitionerNotFound',
        error: 'FINANCIAL_OPERATIONS_PRACTITIONER_NOT_FOUND',
      });
    }

    const page = input.query.page ?? 1;
    const limit = input.query.limit ?? 20;
    const effectiveFrom = input.query.effectiveFrom
      ? new Date(input.query.effectiveFrom)
      : undefined;
    const effectiveTo = input.query.effectiveTo
      ? new Date(input.query.effectiveTo)
      : undefined;

    if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const [items, totalItems] =
      await this.ledgerRepository.listPractitionerLedgerEntries({
        practitionerId: practitioner.id,
        entryType: input.query.entryType,
        balanceBucket: input.query.balanceBucket,
        currencyCode: input.query.currencyCode?.trim().toUpperCase(),
        referenceType: input.query.referenceType?.trim() || undefined,
        paymentId: input.query.paymentId,
        settlementId: input.query.settlementId,
        effectiveFrom,
        effectiveTo,
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      items: items.map((item) =>
        this.financialOperationsMapper.toLedgerEntry(item),
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
