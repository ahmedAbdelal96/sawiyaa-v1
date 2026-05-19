import { LedgerDirection, LedgerEntryType, Prisma } from '@prisma/client';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { PractitionerManualPayoutRepository } from '../repositories/practitioner-manual-payout.repository';
import { PractitionerManualPayoutBalanceService } from './practitioner-manual-payout-balance.service';

describe('PractitionerManualPayoutBalanceService', () => {
  function buildService(input?: {
    practitioner?: Record<string, unknown> | null;
    ledgerCredits?: Array<Record<string, unknown>>;
    ledgerCreditsByCurrency?: Record<string, Array<Record<string, unknown>>>;
    manualPayouts?: Array<Record<string, unknown>>;
    manualPayoutsByCurrency?: Record<string, Array<Record<string, unknown>>>;
    packageSettlements?: Array<Record<string, unknown>>;
    packageSettlementsByCurrency?: Record<
      string,
      Array<Record<string, unknown>>
    >;
  }) {
    const prisma = {
      ledgerEntry: {
        findMany: jest.fn().mockImplementation(async (args) => {
          const currencyCode = args?.where?.currencyCode as string | undefined;
          if (currencyCode && input?.ledgerCreditsByCurrency?.[currencyCode]) {
            return input.ledgerCreditsByCurrency[currencyCode];
          }
          return input?.ledgerCredits ?? [];
        }),
      },
      packageSettlement: {
        findMany: jest.fn().mockImplementation(async (args) => {
          const currencyCode = args?.where?.currencyCode as string | undefined;
          if (
            currencyCode &&
            input?.packageSettlementsByCurrency?.[currencyCode]
          ) {
            return input.packageSettlementsByCurrency[currencyCode];
          }
          return input?.packageSettlements ?? [];
        }),
      },
    };

    const practitionerRepository = {
      findById: jest.fn().mockResolvedValue(
        input?.practitioner ?? {
          id: 'practitioner-1',
          publicSlug: 'practitioner-slug',
          user: { displayName: 'Dr. Lina' },
          country: { isoCode: 'EG' },
        },
      ),
    } as unknown as FinancialOperationsPractitionerRepository;

    const manualPayoutRepository = {
      listForBalance: jest
        .fn()
        .mockImplementation(async (_practitionerId, currencyCode) => {
          if (currencyCode && input?.manualPayoutsByCurrency?.[currencyCode]) {
            return input.manualPayoutsByCurrency[currencyCode];
          }
          return input?.manualPayouts ?? [];
        }),
    } as unknown as PractitionerManualPayoutRepository;

    const service = new PractitionerManualPayoutBalanceService(
      prisma as never,
      practitionerRepository,
      manualPayoutRepository,
    );

    return { service, prisma };
  }

  it('returns a simple balance breakdown and keeps held package money out of payable total', async () => {
    const setup = buildService({
      ledgerCredits: [
        {
          amount: new Prisma.Decimal('100.00'),
          referenceType: 'session-payment',
          referenceId: 'session-1',
        },
        {
          amount: new Prisma.Decimal('50.00'),
          referenceType: 'package-settlement-release',
          referenceId: 'package-settlement-1',
        },
      ],
      manualPayouts: [
        {
          normalSessionAppliedAmount: new Prisma.Decimal('30.00'),
          packageReleasedAppliedAmount: new Prisma.Decimal('10.00'),
          paidAt: new Date('2026-05-05T09:00:00.000Z'),
        },
      ],
      packageSettlements: [
        {
          heldPractitionerAmount: new Prisma.Decimal('200.00'),
          releasedPractitionerAmount: new Prisma.Decimal('80.00'),
        },
      ],
    });

    const balance = await setup.service.getBalance({
      practitionerId: 'practitioner-1',
      currencyCode: 'egp',
    });

    expect(balance.practitionerName).toBe('Dr. Lina');
    expect(balance.currencyCode).toBe('EGP');
    expect(balance.normalSessionPayableAmount).toBe('70.00');
    expect(balance.packageReleasedPayableAmount).toBe('40.00');
    expect(balance.packageHeldAmount).toBe('120.00');
    expect(balance.totalPayableAmount).toBe('110.00');
    expect(balance.lastPayoutAt).toBe('2026-05-05T09:00:00.000Z');
  });

  it('keeps EGP and USD balances separate', async () => {
    const setup = buildService({
      ledgerCreditsByCurrency: {
        EGP: [
          {
            amount: new Prisma.Decimal('80.00'),
            referenceType: 'session-payment',
            referenceId: 'egp-session-1',
          },
        ],
        USD: [
          {
            amount: new Prisma.Decimal('25.00'),
            referenceType: 'session-payment',
            referenceId: 'usd-session-1',
          },
        ],
      },
      manualPayoutsByCurrency: {
        EGP: [
          {
            normalSessionAppliedAmount: new Prisma.Decimal('10.00'),
            packageReleasedAppliedAmount: new Prisma.Decimal('0.00'),
            paidAt: new Date('2026-05-05T09:00:00.000Z'),
          },
        ],
        USD: [
          {
            normalSessionAppliedAmount: new Prisma.Decimal('5.00'),
            packageReleasedAppliedAmount: new Prisma.Decimal('0.00'),
            paidAt: new Date('2026-05-05T10:00:00.000Z'),
          },
        ],
      },
      packageSettlementsByCurrency: {
        EGP: [
          {
            heldPractitionerAmount: new Prisma.Decimal('40.00'),
            releasedPractitionerAmount: new Prisma.Decimal('10.00'),
          },
        ],
        USD: [
          {
            heldPractitionerAmount: new Prisma.Decimal('20.00'),
            releasedPractitionerAmount: new Prisma.Decimal('5.00'),
          },
        ],
      },
    });

    const egpBalance = await setup.service.getBalance({
      practitionerId: 'practitioner-1',
      currencyCode: 'EGP',
    });
    const usdBalance = await setup.service.getBalance({
      practitionerId: 'practitioner-1',
      currencyCode: 'USD',
    });

    expect(egpBalance.totalPayableAmount).toBe('70.00');
    expect(egpBalance.packageHeldAmount).toBe('30.00');
    expect(usdBalance.totalPayableAmount).toBe('20.00');
    expect(usdBalance.packageHeldAmount).toBe('15.00');
    expect(setup.prisma.ledgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ currencyCode: 'EGP' }),
      }),
    );
    expect(setup.prisma.ledgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ currencyCode: 'USD' }),
      }),
    );
  });
});
