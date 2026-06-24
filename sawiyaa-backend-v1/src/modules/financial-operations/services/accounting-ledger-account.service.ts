import { Injectable } from '@nestjs/common';
import { LedgerAccountScope, LedgerAccountType, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  PLATFORM_LEDGER_ACCOUNT_CODES,
  PLATFORM_LEDGER_ACCOUNT_SEEDS,
} from '../types/accounting.types';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AccountingLedgerAccountService {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  private buildPractitionerPayableCode(practitionerId: string) {
    return `LIABILITY_PRACTITIONER_PAYABLE:${practitionerId}`;
  }

  async ensurePlatformAccounts(
    currencyCode: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.getDb(tx);
    const entries = await Promise.all(
      PLATFORM_LEDGER_ACCOUNT_SEEDS.map((seed) =>
        db.ledgerAccount.upsert({
          where: {
            code_currencyCode: {
              code: seed.code,
              currencyCode,
            },
          },
          update: {
            name: seed.name,
            accountType: seed.accountType,
            scope: seed.scope,
            isSystem: true,
            isActive: true,
          },
          create: {
            code: seed.code,
            name: seed.name,
            accountType: seed.accountType,
            scope: seed.scope,
            currencyCode,
            isSystem: true,
            isActive: true,
          },
        }),
      ),
    );

    const byCode = new Map(entries.map((item) => [item.code, item.id]));

    return {
      platformCashAccountId: byCode.get(
        PLATFORM_LEDGER_ACCOUNT_CODES.platformCash,
      )!,
      gatewayClearingAccountId: byCode.get(
        PLATFORM_LEDGER_ACCOUNT_CODES.gatewayClearing,
      )!,
      platformRevenueAccountId: byCode.get(
        PLATFORM_LEDGER_ACCOUNT_CODES.platformRevenue,
      )!,
      transferFeeRecoveryRevenueAccountId: byCode.get(
        PLATFORM_LEDGER_ACCOUNT_CODES.transferFeeRecoveryRevenue,
      )!,
      customerWalletLiabilityAccountId: byCode.get(
        PLATFORM_LEDGER_ACCOUNT_CODES.customerWalletLiability,
      )!,
      vatPayableAccountId: byCode.get(
        PLATFORM_LEDGER_ACCOUNT_CODES.vatPayable,
      )!,
      gatewayFeesExpenseAccountId: byCode.get(
        PLATFORM_LEDGER_ACCOUNT_CODES.gatewayFeesExpense,
      )!,
      transferFeesExpenseAccountId: byCode.get(
        PLATFORM_LEDGER_ACCOUNT_CODES.transferFeesExpense,
      )!,
      refundAdjustmentsAccountId: byCode.get(
        PLATFORM_LEDGER_ACCOUNT_CODES.refundAdjustments,
      )!,
    };
  }

  async ensurePractitionerPayableAccount(input: {
    practitionerId: string;
    currencyCode: string;
    tx?: Prisma.TransactionClient;
  }) {
    const db = this.getDb(input.tx);
    const code = this.buildPractitionerPayableCode(input.practitionerId);

    const account = await db.ledgerAccount.upsert({
      where: {
        code_currencyCode: {
          code,
          currencyCode: input.currencyCode,
        },
      },
      update: {
        name: 'Practitioner Payable',
        accountType: LedgerAccountType.LIABILITY,
        scope: LedgerAccountScope.PRACTITIONER,
        practitionerId: input.practitionerId,
        isActive: true,
      },
      create: {
        code,
        name: 'Practitioner Payable',
        accountType: LedgerAccountType.LIABILITY,
        scope: LedgerAccountScope.PRACTITIONER,
        practitionerId: input.practitionerId,
        currencyCode: input.currencyCode,
        isSystem: true,
        isActive: true,
      },
    });

    return account.id;
  }
}
