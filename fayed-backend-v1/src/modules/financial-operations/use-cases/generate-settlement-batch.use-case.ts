import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { LedgerRepository } from '../repositories/ledger.repository';
import { SettlementRepository } from '../repositories/settlement.repository';

@Injectable()
export class GenerateSettlementBatchUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerRepository: LedgerRepository,
    private readonly settlementRepository: SettlementRepository,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: {
    periodYear: number;
    periodMonth: number;
    currencyCode: string;
  }) {
    const currencyCode = input.currencyCode.trim().toUpperCase();
    const existing = await this.settlementRepository.findBatchByPeriod(
      input.periodYear,
      input.periodMonth,
      currencyCode,
    );

    if (existing) {
      throw new ConflictException({
        messageKey: 'financialOperations.errors.settlementBatchExists',
        error: 'FINANCIAL_OPERATIONS_SETTLEMENT_BATCH_EXISTS',
      });
    }

    const periodEnd = new Date(
      Date.UTC(input.periodYear, input.periodMonth, 0, 23, 59, 59, 999),
    );
    const eligible =
      await this.ledgerRepository.listEligibleLedgerEntriesForSettlement({
        currencyCode,
        effectiveAtLte: periodEnd,
      });

    const grouped = new Map<string, typeof eligible>();
    for (const entry of eligible) {
      const key = entry.practitionerId!;
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    }

    const slug = `settlement-${input.periodYear}-${String(input.periodMonth).padStart(2, '0')}-${currencyCode.toLowerCase()}`;

    const batch = await this.prisma.$transaction(async (tx) => {
      const createdBatch =
        await this.settlementRepository.createSettlementBatch(
          {
            periodYear: input.periodYear,
            periodMonth: input.periodMonth,
            currencyCode,
            status: 'GENERATED',
            slug,
            generatedAt: new Date(),
          },
          tx,
        );

      for (const [practitionerId, entries] of grouped.entries()) {
        const amountNet = entries
          .reduce(
            (sum, entry) => sum.add(entry.amount),
            entries[0].amount.sub(entries[0].amount),
          )
          .toFixed(2);
        const settlement =
          await this.settlementRepository.createPractitionerSettlement(
            {
              batchId: createdBatch.id,
              practitionerId,
              amountGross: amountNet,
              amountAdjustments: '0.00',
              amountNet,
              currencyCode,
              status: 'READY',
            },
            tx,
          );

        await this.ledgerRepository.assignEntriesToSettlement(
          entries.map((entry) => entry.id),
          settlement.id,
          tx,
        );
      }

      return this.settlementRepository.getSettlementBatchDetails(
        createdBatch.id,
        tx,
      );
    });

    return {
      item: this.financialOperationsMapper.toSettlementBatchDetails(batch!),
    };
  }
}
