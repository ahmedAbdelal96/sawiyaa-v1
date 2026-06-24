import { LedgerDirection, LedgerEntryType, Prisma } from '@prisma/client';
import { MoneyAmountService } from './money-amount.service';
import { RefreshPractitionerWalletService } from './refresh-practitioner-wallet.service';

describe('RefreshPractitionerWalletService', () => {
  it('projects practitioner wallet balances from practitioner earning entries only', async () => {
    const prisma = {} as never;
    const ledgerRepository = {
      aggregatePractitionerBalances: jest.fn().mockResolvedValue([
        {
          currencyCode: 'EGP',
          balanceBucket: 'AVAILABLE',
          direction: LedgerDirection.CREDIT,
          entryType: LedgerEntryType.PRACTITIONER_EARNING,
          _sum: { amount: new Prisma.Decimal('70.00') },
          _max: { effectiveAt: new Date('2026-05-03T00:00:00.000Z') },
        },
        {
          currencyCode: 'EGP',
          balanceBucket: 'AVAILABLE',
          direction: LedgerDirection.CREDIT,
          entryType: LedgerEntryType.PLATFORM_COMMISSION,
          _sum: { amount: new Prisma.Decimal('30.00') },
          _max: { effectiveAt: new Date('2026-05-03T00:00:00.000Z') },
        },
        {
          currencyCode: 'EGP',
          balanceBucket: 'AVAILABLE',
          direction: LedgerDirection.DEBIT,
          entryType: LedgerEntryType.PRACTITIONER_EARNING,
          _sum: { amount: new Prisma.Decimal('10.00') },
          _max: { effectiveAt: new Date('2026-05-03T00:00:00.000Z') },
        },
      ]),
    };
    const walletRepository = {
      upsertWallet: jest.fn().mockResolvedValue({}),
    };
    const service = new RefreshPractitionerWalletService(
      prisma,
      ledgerRepository as never,
      walletRepository as never,
      new MoneyAmountService(),
    );

    await service.refresh('practitioner-1');

    expect(ledgerRepository.aggregatePractitionerBalances).toHaveBeenCalledWith(
      'practitioner-1',
      undefined,
    );
    expect(walletRepository.upsertWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerId: 'practitioner-1',
        currencyCode: 'EGP',
        lifetimeEarned: '70.00',
      }),
      undefined,
    );
  });
});
