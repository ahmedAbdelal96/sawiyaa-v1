import { Prisma } from '@prisma/client';
import { ListAdminPractitionerPayoutSummariesUseCase } from './list-admin-practitioner-payout-summaries.use-case';

describe('ListAdminPractitionerPayoutSummariesUseCase', () => {
  function buildUseCase() {
    const prisma = {
      practitionerProfile: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'pr_1',
            publicSlug: 'practitioner-1',
            user: { displayName: 'Dr. One' },
          },
          {
            id: 'pr_2',
            publicSlug: 'practitioner-2',
            user: { displayName: 'Dr. Two' },
          },
        ]),
      },
    };

    const balanceService = {
      getBalance: jest
        .fn()
        .mockImplementation(
          async ({
            practitionerId,
            currencyCode,
          }: {
            practitionerId: string;
            currencyCode: string;
          }) => {
            if (practitionerId === 'pr_1' && currencyCode === 'EGP') {
              return {
                practitionerId: 'pr_1',
                practitionerName: 'Dr. One',
                currencyCode: 'EGP',
                payoutDestinationSnapshot: {
                  methodType: 'BANK_ACCOUNT',
                  accountHolderName: 'Dr. One',
                  bankName: 'National Bank',
                  bankAccountNumber: '123456789',
                  iban: null,
                  walletProvider: null,
                  walletIdentifier: null,
                  otherDetails: null,
                },
                normalSessionPayableAmount: '120.00',
                packageReleasedPayableAmount: '0.00',
                packageHeldAmount: '0.00',
                totalPayableAmount: '120.00',
                lastPayoutAt: '2026-05-05T10:00:00.000Z',
              };
            }

            if (practitionerId === 'pr_1' && currencyCode === 'USD') {
              return {
                practitionerId: 'pr_1',
                practitionerName: 'Dr. One',
                currencyCode: 'USD',
                payoutDestinationSnapshot: {
                  methodType: 'BANK_ACCOUNT',
                  accountHolderName: 'Dr. One',
                  bankName: 'National Bank',
                  bankAccountNumber: '123456789',
                  iban: null,
                  walletProvider: null,
                  walletIdentifier: null,
                  otherDetails: null,
                },
                normalSessionPayableAmount: '0.00',
                packageReleasedPayableAmount: '25.00',
                packageHeldAmount: '50.00',
                totalPayableAmount: '25.00',
                lastPayoutAt: '2026-05-06T08:00:00.000Z',
              };
            }

            return {
              practitionerId: practitionerId,
              practitionerName: 'Dr. Two',
              currencyCode,
              payoutDestinationSnapshot: null,
              normalSessionPayableAmount: '0.00',
              packageReleasedPayableAmount: '0.00',
              packageHeldAmount: '0.00',
              totalPayableAmount: '0.00',
              lastPayoutAt: null,
            };
          },
        ),
    };

    const mapper = {
      toPractitionerManualPayoutSummary: jest
        .fn()
        .mockImplementation((value) => value),
    };

    const useCase = new ListAdminPractitionerPayoutSummariesUseCase(
      prisma as never,
      balanceService as never,
      mapper as never,
    );

    return { useCase, prisma, balanceService, mapper };
  }

  it('returns only practitioners with payable or package balances and keeps currencies separate', async () => {
    const setup = buildUseCase();

    const result = await setup.useCase.execute({
      query: { page: 1, limit: 10 } as any,
    });

    expect(setup.prisma.practitionerProfile.findMany).toHaveBeenCalledTimes(1);
    expect(setup.balanceService.getBalance).toHaveBeenCalledTimes(4);
    expect(result.pagination.totalItems).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].practitionerId).toBe('pr_1');
    expect(result.items[0].egp.totalPayableAmount).toBe('120.00');
    expect(result.items[0].usd.packageHeldAmount).toBe('50.00');
    expect(result.items[0].egp.payoutDestinationSnapshot?.methodType).toBe('BANK_ACCOUNT');
  });

  it('supports search filtering before computing balances', async () => {
    const setup = buildUseCase();

    await setup.useCase.execute({
      query: { page: 1, limit: 10, search: 'Two' } as any,
    });

    expect(setup.prisma.practitionerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      }),
    );
  });
});
