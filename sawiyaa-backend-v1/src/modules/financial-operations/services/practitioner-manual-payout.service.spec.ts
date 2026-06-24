import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccountingJournalPostingService } from './accounting-journal-posting.service';
import { LedgerRepository } from '../repositories/ledger.repository';
import { PractitionerManualPayoutRepository } from '../repositories/practitioner-manual-payout.repository';
import { PractitionerManualPayoutBalanceService } from './practitioner-manual-payout-balance.service';
import { RefreshPractitionerWalletService } from './refresh-practitioner-wallet.service';
import { PractitionerManualPayoutService } from './practitioner-manual-payout.service';

describe('PractitionerManualPayoutService', () => {
  function buildService(input?: {
    balance?: Record<string, string>;
    existingTransferReference?: Record<string, unknown> | null;
  }) {
    const manualPayoutRepository = {
      findByTransferReference: jest
        .fn()
        .mockResolvedValue(input?.existingTransferReference ?? null),
      create: jest.fn().mockImplementation(async (data) => ({
        id: 'manual-payout-1',
        practitionerId: data.practitionerId,
        practitionerName: 'Dr. Lina',
        currencyCode: data.currencyCode,
        amountPaid: data.amountPaid.toFixed(2),
        normalSessionAppliedAmount: data.normalSessionAppliedAmount.toFixed(2),
        packageReleasedAppliedAmount:
          data.packageReleasedAppliedAmount.toFixed(2),
        packageHeldAmountSnapshot: data.packageHeldAmountSnapshot.toFixed(2),
        totalPayableSnapshot: data.totalPayableSnapshot.toFixed(2),
        payoutMethod: data.payoutMethod,
        transferReference: data.transferReference,
        paidAt: data.paidAt,
        notes: data.notes,
        recordedByUserId: data.recordedByUserId,
        recordedByDisplayName: 'Admin',
        createdAt: new Date('2026-05-05T10:00:00.000Z'),
        updatedAt: new Date('2026-05-05T10:00:00.000Z'),
      })),
    } as unknown as PractitionerManualPayoutRepository;

    const balanceService = {
      getBalance: jest.fn().mockResolvedValue(
        input?.balance ?? {
          practitionerId: 'practitioner-1',
          practitionerName: 'Dr. Lina',
          currencyCode: 'EGP',
          normalSessionPayableAmount: '100.00',
          packageReleasedPayableAmount: '50.00',
          packageHeldAmount: '80.00',
          totalPayableAmount: '150.00',
          lastPayoutAt: null,
        },
      ),
    } as unknown as PractitionerManualPayoutBalanceService;

    const ledgerRepository = {
      createLedgerEntry: jest.fn().mockResolvedValue({}),
    } as unknown as LedgerRepository;

    const refreshPractitionerWalletService = {
      refresh: jest.fn().mockResolvedValue(undefined),
    } as unknown as RefreshPractitionerWalletService;

    const accountingJournalPostingService = {
      postPractitionerPayout: jest.fn().mockResolvedValue(undefined),
    } as unknown as AccountingJournalPostingService;

    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PractitionerManualPayoutService(
      prisma as never,
      manualPayoutRepository,
      balanceService,
      ledgerRepository,
      refreshPractitionerWalletService,
      accountingJournalPostingService,
    );

    return {
      service,
      manualPayoutRepository,
      balanceService,
      ledgerRepository,
      refreshPractitionerWalletService,
      accountingJournalPostingService,
      prisma,
    };
  }

  it('records a partial payout and leaves the remaining balance available', async () => {
    const setup = buildService();

    const result = await setup.service.record({
      practitionerId: 'practitioner-1',
      currencyCode: 'egp',
      amountPaid: '120',
      paidAt: new Date('2026-05-05T10:00:00.000Z'),
      paymentMethod: 'MANUAL_BANK_TRANSFER',
      transferReference: 'BANK-001',
      notes: 'Partial payout',
    });

    expect(setup.manualPayoutRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amountPaid: new Prisma.Decimal('120.00'),
        normalSessionAppliedAmount: new Prisma.Decimal('100.00'),
        packageReleasedAppliedAmount: new Prisma.Decimal('20.00'),
        packageHeldAmountSnapshot: new Prisma.Decimal('80.00'),
        totalPayableSnapshot: new Prisma.Decimal('150.00'),
      }),
      undefined,
    );
    expect(setup.ledgerRepository.createLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: new Prisma.Decimal('120.00'),
        balanceBucket: 'AVAILABLE',
        referenceType: 'practitioner-manual-payout',
      }),
      undefined,
    );
    expect(setup.refreshPractitionerWalletService.refresh).toHaveBeenCalledWith(
      'practitioner-1',
      undefined,
    );
    expect(
      setup.accountingJournalPostingService.postPractitionerPayout,
    ).toHaveBeenCalled();
    expect(result.wasAlreadyRecorded).toBe(false);
  });

  it('rejects amounts above the payable balance', async () => {
    const setup = buildService();

    await expect(
      setup.service.record({
        practitionerId: 'practitioner-1',
        currencyCode: 'EGP',
        amountPaid: '151',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects zero or negative payout amounts', async () => {
    const setup = buildService();

    await expect(
      setup.service.record({
        practitionerId: 'practitioner-1',
        currencyCode: 'EGP',
        amountPaid: '0',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      setup.service.record({
        practitionerId: 'practitioner-1',
        currencyCode: 'EGP',
        amountPaid: '-5',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('treats duplicate transfer reference as idempotent', async () => {
    const existing = {
      id: 'manual-payout-existing',
      practitionerId: 'practitioner-1',
      currencyCode: 'EGP',
    };
    const setup = buildService({
      existingTransferReference: existing,
    });

    const result = await setup.service.record({
      practitionerId: 'practitioner-1',
      currencyCode: 'EGP',
      amountPaid: '10',
      transferReference: 'BANK-001',
    });

    expect(result.wasAlreadyRecorded).toBe(true);
    expect(setup.manualPayoutRepository.create).not.toHaveBeenCalled();
    expect(setup.ledgerRepository.createLedgerEntry).not.toHaveBeenCalled();
    expect(
      setup.refreshPractitionerWalletService.refresh,
    ).not.toHaveBeenCalled();
  });
});
