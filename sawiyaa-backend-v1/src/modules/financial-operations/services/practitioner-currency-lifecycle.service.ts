import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SecurityAuditActorType, SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditSource } from '@common/security-audit/security-audit.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { WalletRepository } from '../repositories/wallet.repository';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PractitionerCurrencyLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletRepository: WalletRepository,
    private readonly audit: SecurityAuditService,
  ) {}

  private currencyForCountry(country: { isoCode: string } | null): string {
    return ['EG', 'EGY'].includes((country?.isoCode ?? '').trim().toUpperCase())
      ? 'EGP'
      : 'USD';
  }

  private db(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  /**
   * Reconciles the wallet lifecycle before the practitioner's country is saved.
   * Non-terminal settlements are blocked so no financial record can be stranded
   * in the previous currency.
   */
  async ensureForCountryChange(input: {
    practitionerId: string;
    newCountryId: string | null;
    actorUserId: string;
    tx: Prisma.TransactionClient;
  }) {
    const db = this.db(input.tx);
    const profile = await db.practitionerProfile.findUnique({
      where: { id: input.practitionerId },
      select: { country: { select: { isoCode: true } } },
    });
    const nextCountry = input.newCountryId
      ? await db.country.findUnique({
          where: { id: input.newCountryId },
          select: { isoCode: true },
        })
      : null;
    const activeWallet = await db.practitionerWallet.findFirst({
      where: { practitionerId: input.practitionerId, status: 'ACTIVE' },
      select: {
        id: true,
        currencyCode: true,
        availableBalance: true,
        pendingBalance: true,
        reservedBalance: true,
      },
    });
    const expectedOldCurrency = this.currencyForCountry(profile?.country ?? null);
    const newCurrency = this.currencyForCountry(nextCountry);
    // Use the active wallet as the observed source of truth when repairing an
    // already inconsistent legacy state. The country remains the authority for
    // the target currency.
    const oldCurrency = activeWallet?.currencyCode ?? expectedOldCurrency;

    if (oldCurrency === newCurrency) {
      return { changed: false, oldCurrency, newCurrency, oldWalletId: activeWallet?.id ?? null, newWalletId: activeWallet?.id ?? null };
    }

    const openSettlements = await db.practitionerSettlement.count({
      where: {
        practitionerId: input.practitionerId,
        status: { in: ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'READY', 'PROCESSING'] },
      },
    });
    const hasWalletBalance = Boolean(
      activeWallet &&
        (!new Prisma.Decimal(activeWallet.availableBalance).eq(0) ||
          !new Prisma.Decimal(activeWallet.pendingBalance).eq(0) ||
          !new Prisma.Decimal(activeWallet.reservedBalance).eq(0)),
    );

    if (hasWalletBalance || openSettlements > 0) {
      throw new BadRequestException({
        messageKey: 'financialOperations.errors.walletCurrencyChangeRequiresSettlement',
        error: 'FINANCIAL_OPERATIONS_WALLET_CURRENCY_CHANGE_REQUIRES_SETTLEMENT',
        details: {
          oldCurrency,
          newCurrency,
          walletId: activeWallet?.id ?? null,
          openSettlements,
        },
      });
    }

    const newWallet = await this.walletRepository.ensureActiveWallet(
      input.practitionerId,
      newCurrency,
      input.tx,
    );
    await this.audit.recordRequired(input.tx, {
      action: 'financial.practitioner.wallet.currency.changed',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorType: SecurityAuditActorType.USER,
      source: SecurityAuditSource.HTTP_REQUEST,
      actorUserId: input.actorUserId,
      resourceType: 'PractitionerWallet',
      resourceId: newWallet.id,
      metadata: {
        practitionerId: input.practitionerId,
        oldWalletId: activeWallet?.id ?? null,
        newWalletId: newWallet.id,
        oldCurrency,
        newCurrency,
        oldBalance: activeWallet?.availableBalance?.toString() ?? '0',
      },
    });

    return {
      changed: true,
      oldCurrency,
      newCurrency,
      oldWalletId: activeWallet?.id ?? null,
      newWalletId: newWallet.id,
    };
  }
}
