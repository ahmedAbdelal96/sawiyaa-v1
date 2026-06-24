import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { ListPractitionerPayoutDueDto } from '../dto/practitioner-payout.dto';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class ListPractitionerPayoutDuesUseCase {
  constructor(
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly settlementRepository: SettlementRepository,
    private readonly walletRepository: WalletRepository,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: {
    practitionerId: string;
    query: ListPractitionerPayoutDueDto;
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
    const currencyCode = input.query.currencyCode?.trim().toUpperCase();

    if (currencyCode && currencyCode.length !== 3) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.invalidFilter',
        error: FINANCIAL_OPS_ERROR_CODES.invalidFilter,
      });
    }

    const [settlementResult, summaries, wallets] = await Promise.all([
      this.settlementRepository.listPractitionerDueSettlements({
        practitionerId: practitioner.id,
        currencyCode,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.settlementRepository.aggregatePractitionerDueSummary({
        practitionerId: practitioner.id,
        currencyCode,
      }),
      this.walletRepository.findByPractitionerId(practitioner.id),
    ]);

    const [items, totalItems] = settlementResult;

    const walletByCurrency = new Map(
      wallets.map((wallet) => [wallet.currencyCode, wallet]),
    );

    return {
      items: items.map((item) =>
        this.financialOperationsMapper.toPractitionerPayoutDue(item),
      ),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
      summaries: summaries.map((summary) =>
        this.financialOperationsMapper.toPractitionerPayoutDueSummary({
          currency: summary.currencyCode,
          dueCount: summary._count.id,
          dueAmountNet: new Prisma.Decimal(summary._sum.amountNet ?? 0)
            .sub(new Prisma.Decimal(summary._sum.amountPaidTotal ?? 0))
            .toFixed(2),
          lastDueAt: summary._max.createdAt ?? null,
          walletAvailableBalance:
            walletByCurrency.get(summary.currencyCode)?.availableBalance ??
            null,
          walletReservedBalance:
            walletByCurrency.get(summary.currencyCode)?.reservedBalance ?? null,
          walletPendingBalance:
            walletByCurrency.get(summary.currencyCode)?.pendingBalance ?? null,
          walletUpdatedAt:
            walletByCurrency.get(summary.currencyCode)?.updatedAt ?? null,
        }),
      ),
    };
  }
}
