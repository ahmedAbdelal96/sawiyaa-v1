/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { LedgerDirection, Prisma } from '@prisma/client';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { PractitionerManualPayoutRepository } from '../repositories/practitioner-manual-payout.repository';
import { PractitionerRecoveryService } from './practitioner-recovery.service';
import { PractitionerManualPayoutBalanceService } from './practitioner-manual-payout-balance.service';

describe('PractitionerManualPayoutBalanceService', () => {
  function buildService(input?: {
    practitioner?: Record<string, unknown> | null;
    ledgerCredits?: Array<Record<string, unknown>>;
    ledgerCreditsByCurrency?: Record<string, Array<Record<string, unknown>>>;
    manualPayouts?: Array<Record<string, unknown>>;
    manualPayoutsByCurrency?: Record<string, Array<Record<string, unknown>>>;
    settlementPayouts?: Array<Record<string, unknown>>;
    settlementPayoutsByCurrency?: Record<
      string,
      Array<Record<string, unknown>>
    >;
    packageSettlements?: Array<Record<string, unknown>>;
    packageSettlementsByCurrency?: Record<
      string,
      Array<Record<string, unknown>>
    >;
    recoveryAmount?: string;
    recoveryAmountByCurrency?: Record<string, string>;
  }) {
    const prisma = {
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
      practitionerSettlementPayout: {
        findMany: jest.fn().mockImplementation(async (args) => {
          const currencyCode = args?.where?.currencyCode as string | undefined;
          if (
            currencyCode &&
            input?.settlementPayoutsByCurrency?.[currencyCode]
          ) {
            return input.settlementPayoutsByCurrency[currencyCode];
          }
          return input?.settlementPayouts ?? [];
        }),
      },
      ledgerEntry: {
        findMany: jest.fn().mockImplementation(async (args) => {
          const currencyCode = args?.where?.currencyCode as string | undefined;
          if (currencyCode && input?.ledgerCreditsByCurrency?.[currencyCode]) {
            return input.ledgerCreditsByCurrency[currencyCode];
          }
          return input?.ledgerCredits ?? [];
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
          payoutDestination: {
            methodType: 'WALLET',
            accountHolderName: 'Dr. Lina',
            bankName: null,
            bankAccountNumber: null,
            iban: null,
            walletProvider: 'Vodafone Cash',
            walletIdentifier: '01012345678',
            otherDetails: null,
          },
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

    const practitionerRecoveryService = {
      getOutstandingAmount: jest.fn().mockImplementation(async (args) => {
        const currencyCode = args?.currencyCode as string | undefined;
        if (currencyCode && input?.recoveryAmountByCurrency?.[currencyCode]) {
          return new Prisma.Decimal(input.recoveryAmountByCurrency[currencyCode]);
        }
        return new Prisma.Decimal(input?.recoveryAmount ?? '0.00');
      }),
    } as unknown as PractitionerRecoveryService;

    const service = new PractitionerManualPayoutBalanceService(
      prisma as never,
      practitionerRepository,
      manualPayoutRepository,
      practitionerRecoveryService,
    );

    return { service, prisma, practitionerRecoveryService };
  }

  it('returns a simple balance breakdown and keeps held package money out of payable total', async () => {
    const setup = buildService({
      ledgerCredits: [
        {
          amount: new Prisma.Decimal('100.00'),
          direction: LedgerDirection.CREDIT,
          referenceType: 'session-payment',
          referenceId: 'session-1',
        },
        {
          amount: new Prisma.Decimal('50.00'),
          direction: LedgerDirection.CREDIT,
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
      settlementPayouts: [
        {
          effectiveAt: new Date('2026-05-10T09:00:00.000Z'),
        },
      ],
      recoveryAmount: '15.00',
    });

    const balance = await setup.service.getBalance({
      practitionerId: 'practitioner-1',
      currencyCode: 'egp',
    });

    expect(balance.practitionerName).toBe('Dr. Lina');
    expect(balance.currencyCode).toBe('EGP');
    expect(balance.payoutDestinationSnapshot?.methodType).toBe('WALLET');
    expect(balance.payoutDestinationSnapshot?.walletProvider).toBe(
      'Vodafone Cash',
    );
    expect(balance.normalSessionPayableAmount).toBe('55.00');
    expect(balance.packageReleasedPayableAmount).toBe('40.00');
    expect(balance.packageHeldAmount).toBe('120.00');
    expect(balance.totalPayableAmount).toBe('95.00');
    expect(balance.manualRecoveryAmount).toBe('15.00');
    expect(balance.lastPayoutAt).toBe('2026-05-05T09:00:00.000Z');
  });

  it('treats refund reversal debits as reducing payable balance', async () => {
    const setup = buildService({
      ledgerCredits: [
        {
          amount: new Prisma.Decimal('100.00'),
          direction: LedgerDirection.CREDIT,
          referenceType: 'session-payment',
          referenceId: 'session-1',
        },
        {
          amount: new Prisma.Decimal('20.00'),
          direction: LedgerDirection.DEBIT,
          referenceType: 'refund',
          referenceId: 'refund-1',
        },
      ],
    });

    const balance = await setup.service.getBalance({
      practitionerId: 'practitioner-1',
      currencyCode: 'EGP',
    });

    expect(balance.normalSessionPayableAmount).toBe('80.00');
    expect(balance.totalPayableAmount).toBe('80.00');
  });

  it('keeps EGP and USD balances separate', async () => {
    const setup = buildService({
      ledgerCreditsByCurrency: {
        EGP: [
          {
            amount: new Prisma.Decimal('80.00'),
            direction: LedgerDirection.CREDIT,
            referenceType: 'session-payment',
            referenceId: 'egp-session-1',
          },
        ],
        USD: [
          {
            amount: new Prisma.Decimal('25.00'),
            direction: LedgerDirection.CREDIT,
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

  it('tracks outstanding recovery separately from payout history', async () => {
    const setup = buildService({
      manualPayouts: [
        {
          normalSessionAppliedAmount: new Prisma.Decimal('10.00'),
          packageReleasedAppliedAmount: new Prisma.Decimal('0.00'),
          paidAt: new Date('2026-05-05T09:00:00.000Z'),
        },
      ],
      settlementPayouts: [
        {
          effectiveAt: new Date('2026-05-03T09:00:00.000Z'),
        },
      ],
      recoveryAmount: '34.00',
    });

    const balance = await setup.service.getBalance({
      practitionerId: 'practitioner-1',
      currencyCode: 'EGP',
    });

    expect(balance.manualRecoveryAmount).toBe('34.00');
  });
});
