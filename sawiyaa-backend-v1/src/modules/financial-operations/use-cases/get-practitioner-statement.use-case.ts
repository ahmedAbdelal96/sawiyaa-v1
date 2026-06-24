import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { LedgerRepository } from '../repositories/ledger.repository';
import { SettlementPayoutRepository } from '../repositories/settlement-payout.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { ListPractitionerStatementDto } from '../dto/practitioner-statement.dto';
import { FINANCIAL_OPS_ERROR_CODES } from '../types/financial-operations.types';

@Injectable()
export class GetPractitionerStatementUseCase {
  constructor(
    private readonly practitionerRepository: FinancialOperationsPractitionerRepository,
    private readonly ledgerRepository: LedgerRepository,
    private readonly settlementPayoutRepository: SettlementPayoutRepository,
    private readonly walletRepository: WalletRepository,
    private readonly financialOperationsMapper: FinancialOperationsMapper,
  ) {}

  async execute(input: {
    practitionerId: string;
    query: ListPractitionerStatementDto;
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

    const currencyCode =
      input.query.currencyCode?.trim().toUpperCase() || undefined;
    const rowType = input.query.rowType ?? 'ALL';

    const [ledgerRows, payoutRows, wallets] = await Promise.all([
      this.ledgerRepository.listPractitionerStatementLedgerEntries({
        practitionerId: practitioner.id,
        currencyCode,
        effectiveFrom,
        effectiveTo,
      }),
      this.settlementPayoutRepository.listPractitionerStatementPayouts({
        practitionerId: practitioner.id,
        currencyCode,
        createdFrom: effectiveFrom,
        createdTo: effectiveTo,
      }),
      this.walletRepository.findByPractitionerId(practitioner.id),
    ]);

    const rows = [
      ...ledgerRows.map((entry) =>
        this.financialOperationsMapper.toPractitionerStatementLedgerRow(entry),
      ),
      ...payoutRows.map((payout) =>
        this.financialOperationsMapper.toPractitionerStatementPayoutRow(payout),
      ),
    ]
      .filter((row) => rowType === 'ALL' || row.rowType === rowType)
      .sort(
        (a, b) =>
          new Date(a.effectiveAt).getTime() -
            new Date(b.effectiveAt).getTime() ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
          a.id.localeCompare(b.id),
      );

    const currencySummaryMap = new Map<
      string,
      {
        currency: string;
        rowCount: number;
        earningRowsCount: number;
        payoutRowsCount: number;
        earningTotal: Prisma.Decimal;
        payoutTotal: Prisma.Decimal;
      }
    >();

    let earningRowsCount = 0;
    let payoutRowsCount = 0;
    let earningTotal = new Prisma.Decimal(0);
    let payoutTotal = new Prisma.Decimal(0);

    for (const row of rows) {
      const current = currencySummaryMap.get(row.currency) ?? {
        currency: row.currency,
        rowCount: 0,
        earningRowsCount: 0,
        payoutRowsCount: 0,
        earningTotal: new Prisma.Decimal(0),
        payoutTotal: new Prisma.Decimal(0),
      };

      const amount = new Prisma.Decimal(row.amount);
      current.rowCount += 1;

      if (row.rowType === 'EARNING') {
        earningRowsCount += 1;
        earningTotal = earningTotal.add(amount);
        current.earningRowsCount += 1;
        current.earningTotal = current.earningTotal.add(amount);
      } else {
        payoutRowsCount += 1;
        payoutTotal = payoutTotal.add(amount);
        current.payoutRowsCount += 1;
        current.payoutTotal = current.payoutTotal.add(amount);
      }

      currencySummaryMap.set(row.currency, current);
    }

    const firstActivityAt = rows[0]?.effectiveAt ?? null;
    const lastActivityAt = rows.at(-1)?.effectiveAt ?? null;

    const singleCurrencySummary =
      currencySummaryMap.size === 1
        ? Array.from(currencySummaryMap.values())[0]
        : null;

    return {
      practitioner: {
        id: practitioner.id,
        displayName: practitioner.user?.displayName ?? null,
        publicSlug: practitioner.publicSlug ?? null,
        professionalTitle: practitioner.professionalTitle ?? null,
        countryCode: practitioner.country?.isoCode ?? null,
      },
      generatedAt: new Date().toISOString(),
      filters: {
        currencyCode: currencyCode ?? null,
        rowType,
        effectiveFrom: effectiveFrom?.toISOString() ?? null,
        effectiveTo: effectiveTo?.toISOString() ?? null,
      },
      summary: {
        rowCount: rows.length,
        earningRowsCount,
        payoutRowsCount,
        earningTotal:
          currencyCode || singleCurrencySummary
            ? earningTotal.toFixed(2)
            : '0.00',
        payoutTotal:
          currencyCode || singleCurrencySummary
            ? payoutTotal.toFixed(2)
            : '0.00',
        netTotal:
          currencyCode || singleCurrencySummary
            ? earningTotal.sub(payoutTotal).toFixed(2)
            : '0.00',
        firstActivityAt,
        lastActivityAt,
        currencySummaries: Array.from(currencySummaryMap.values())
          .sort((a, b) => a.currency.localeCompare(b.currency))
          .map((item) => ({
            currency: item.currency,
            rowCount: item.rowCount,
            earningRowsCount: item.earningRowsCount,
            payoutRowsCount: item.payoutRowsCount,
            earningTotal: item.earningTotal.toFixed(2),
            payoutTotal: item.payoutTotal.toFixed(2),
            netTotal: item.earningTotal.sub(item.payoutTotal).toFixed(2),
          })),
        walletSummaries: wallets.map((wallet) => ({
          currency: wallet.currencyCode,
          availableBalance: wallet.availableBalance.toString(),
          pendingBalance: wallet.pendingBalance.toString(),
          reservedBalance: wallet.reservedBalance.toString(),
          totalEarned: wallet.lifetimeEarned.toString(),
          lifetimePaidOut: wallet.lifetimePaidOut.toString(),
          lastLedgerEntryAt: wallet.lastLedgerEntryAt?.toISOString() ?? null,
          updatedAt: wallet.updatedAt?.toISOString() ?? null,
        })),
      },
      rows,
    };
  }
}
