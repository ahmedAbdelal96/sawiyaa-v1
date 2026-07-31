import { BadRequestException } from '@nestjs/common';
import { LedgerDirection, LedgerEntryType, Prisma } from '@prisma/client';
import { LedgerRepository } from '../repositories/ledger.repository';
import { SettlementRepository } from '../repositories/settlement.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { ApprovePractitionerSettlementService } from './approve-practitioner-settlement.service';
import { PractitionerManualPayoutService } from './practitioner-manual-payout.service';

describe('Phase 1.5 financial invariants', () => {
  it('rejects a practitioner earning created without approved settlement provenance', () => {
    const repository = new LedgerRepository({} as never);

    expect(() =>
      repository.createLedgerEntry({
        practitionerId: 'practitioner-1',
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: LedgerDirection.CREDIT,
        amount: new Prisma.Decimal('10'),
        currencyCode: 'EGP',
        balanceBucket: 'AVAILABLE',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a practitioner earning whose ledger currency differs from its wallet', async () => {
    const ledgerEntryCreate = jest.fn();
    const repository = new LedgerRepository({
      practitionerSettlement: {
        findUnique: jest.fn().mockResolvedValue({
          walletId: 'wallet-egp',
          walletCurrencyCode: 'EGP',
          wallet: { currencyCode: 'EGP' },
        }),
      },
      ledgerEntry: { create: ledgerEntryCreate },
    } as never);

    await expect(
      repository.createLedgerEntry({
        practitionerId: 'practitioner-1',
        settlementId: 'settlement-1',
        entryType: LedgerEntryType.PRACTITIONER_EARNING,
        direction: LedgerDirection.CREDIT,
        amount: new Prisma.Decimal('10'),
        currencyCode: 'USD',
        balanceBucket: 'AVAILABLE',
        actorUserId: 'admin-1',
        actorType: 'USER',
        effectiveAt: new Date('2026-07-30T00:00:00.000Z'),
      }),
    ).rejects.toThrow(BadRequestException);
    expect(ledgerEntryCreate).not.toHaveBeenCalled();
  });

  it('does not double credit when the same approved review is retried', async () => {
    const db = {
      ledgerEntry: {
        findFirst: jest.fn().mockResolvedValue({ settlementId: 'settlement-1' }),
      },
      practitionerProfile: { findUnique: jest.fn() },
      practitionerSettlement: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'settlement-1' }),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      settlementBatch: { upsert: jest.fn() },
    };
    const ledgerRepository = { createManyLedgerEntries: jest.fn() } as never;
    const walletRepository = { ensureActiveWallet: jest.fn() } as never;
    const service = new ApprovePractitionerSettlementService(
      ledgerRepository,
      walletRepository,
    );

    await service.approveAndCredit({
      db: db as never,
      practitionerId: 'practitioner-1',
      sessionEarningReviewId: 'review-1',
      originalAmount: new Prisma.Decimal('100'),
      originalCurrencyCode: 'USD',
      walletCurrencyCode: 'EGP',
      convertedAmount: new Prisma.Decimal('5000'),
      finalWalletCredit: new Prisma.Decimal('5000'),
      platformAmount: new Prisma.Decimal('0'),
      actorUserId: 'admin-1',
      referenceType: 'session-earning-review',
      referenceId: 'review-1',
      description: 'approved',
    });

    expect(db.practitionerSettlement.upsert).not.toHaveBeenCalled();
    expect(ledgerRepository.createManyLedgerEntries).not.toHaveBeenCalled();
  });

  it('preserves original and converted currency snapshots on approval', async () => {
    const db = {
      ledgerEntry: { findFirst: jest.fn().mockResolvedValue(null) },
      practitionerProfile: {
        findUnique: jest.fn().mockResolvedValue({
          country: { isoCode: 'EGY' },
        }),
      },
      settlementBatch: {
        upsert: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      practitionerWallet: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'wallet-egp',
          currencyCode: 'EGP',
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'wallet-egp',
          currencyCode: 'EGP',
        }),
      },
      practitionerSettlement: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'settlement-1' }),
        update: jest.fn().mockResolvedValue({}),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'settlement-1' }),
      },
    };
    const ledgerRepository = {
      createManyLedgerEntries: jest.fn().mockResolvedValue({ count: 1 }),
    } as never;
    const walletRepository = {
      ensureActiveWallet: jest.fn().mockResolvedValue({ id: 'wallet-egp' }),
    } as never;
    const service = new ApprovePractitionerSettlementService(
      ledgerRepository,
      walletRepository,
    );

    await service.approveAndCredit({
      db: db as never,
      practitionerId: 'practitioner-1',
      sessionEarningReviewId: 'review-1',
      originalAmount: new Prisma.Decimal('100'),
      originalCurrencyCode: 'USD',
      walletCurrencyCode: 'EGP',
      exchangeRate: new Prisma.Decimal('50'),
      convertedAmount: new Prisma.Decimal('5000'),
      finalWalletCredit: new Prisma.Decimal('4950'),
      platformAmount: new Prisma.Decimal('0'),
      actorUserId: 'admin-1',
      referenceType: 'session-earning-review',
      referenceId: 'review-1',
      description: 'approved',
    });

    expect(db.practitionerSettlement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          originalAmount: new Prisma.Decimal('100'),
          originalCurrencyCode: 'USD',
          walletCurrencyCode: 'EGP',
          exchangeRate: new Prisma.Decimal('50'),
          convertedAmount: new Prisma.Decimal('5000'),
          finalWalletCredit: new Prisma.Decimal('4950'),
        }),
      }),
    );
  });

  it('closes an empty active wallet before changing currency', async () => {
    const db = {
      practitionerWallet: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'wallet-egp',
          currencyCode: 'EGP',
          availableBalance: new Prisma.Decimal('0'),
          pendingBalance: new Prisma.Decimal('0'),
          reservedBalance: new Prisma.Decimal('0'),
        }),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({ id: 'wallet-usd' }),
      },
    };
    const repository = new WalletRepository({} as never);

    await repository.ensureActiveWallet('practitioner-1', 'USD', db as never);

    expect(db.practitionerWallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'wallet-egp' },
        data: expect.objectContaining({ status: 'CLOSED' }),
      }),
    );
  });

  it('rejects currency change while the active wallet has unsettled balance', async () => {
    const db = {
      practitionerWallet: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'wallet-egp',
          currencyCode: 'EGP',
          availableBalance: new Prisma.Decimal('100'),
          pendingBalance: new Prisma.Decimal('0'),
          reservedBalance: new Prisma.Decimal('0'),
        }),
      },
    };
    const repository = new WalletRepository({} as never);

    await expect(
      repository.ensureActiveWallet('practitioner-1', 'USD', db as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks direct mutation of an approved settlement amount', async () => {
    const db = {
      practitionerSettlement: {
        findUnique: jest.fn().mockResolvedValue({ status: 'CREDITED' }),
        update: jest.fn(),
      },
    };
    const repository = new SettlementRepository({} as never);

    await expect(
      repository.updatePractitionerSettlement(
        'settlement-1',
        { amountNet: new Prisma.Decimal('1') },
        db as never,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(db.practitionerSettlement.update).not.toHaveBeenCalled();
  });

  it('rejects manual payout without settlement reference', async () => {
    const service = new PractitionerManualPayoutService(
      { practitionerSettlement: {} } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.record({
        practitionerId: 'practitioner-1',
        settlementId: '',
        currencyCode: 'EGP',
        amountPaid: '10',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
