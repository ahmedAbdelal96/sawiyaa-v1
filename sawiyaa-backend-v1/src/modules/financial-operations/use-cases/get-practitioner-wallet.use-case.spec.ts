/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { NotFoundException } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { PractitionerManualPayoutBalanceService } from '../services/practitioner-manual-payout-balance.service';
import { GetPractitionerWalletUseCase } from './get-practitioner-wallet.use-case';

describe('GetPractitionerWalletUseCase', () => {
  const findByUserIdMock = jest.fn();
  const findByPractitionerIdMock = jest.fn();
  const getBalanceMock = jest
    .fn<
      Promise<{ manualRecoveryAmount: string }>,
      [{ practitionerId: string; currencyCode: string }]
    >()
    .mockResolvedValue({ manualRecoveryAmount: '0.00' });
  const toWalletMock = jest.fn((input) => input);
  const practitionerRepository = {
    findByUserId: findByUserIdMock,
  } as unknown as FinancialOperationsPractitionerRepository;
  const walletRepository = {
    findByPractitionerId: findByPractitionerIdMock,
  } as unknown as WalletRepository;
  const balanceService = {
    getBalance: getBalanceMock,
  } as unknown as PractitionerManualPayoutBalanceService;
  const financialOperationsMapper = {
    toWallet: toWalletMock,
  } as unknown as FinancialOperationsMapper;

  const useCase = new GetPractitionerWalletUseCase(
    practitionerRepository,
    walletRepository,
    balanceService,
    financialOperationsMapper,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns explicit default zero wallet state when no wallet rows exist', async () => {
    findByUserIdMock.mockResolvedValue({
      id: 'pract_1',
    });
    findByPractitionerIdMock.mockResolvedValue([]);

    const result = await useCase.execute({ userId: 'user_1' });

    expect(getBalanceMock).toHaveBeenCalledWith({
      practitionerId: 'pract_1',
      currencyCode: 'EGP',
    });
    expect(result.item).toEqual({
      currency: 'EGP',
      pendingBalance: '0.00',
      availableBalance: '0.00',
      reservedBalance: '0.00',
      totalEarned: '0.00',
      lifetimePaidOut: '0.00',
      manualRecoveryAmount: '0.00',
      lastLedgerEntryAt: null,
      updatedAt: null,
    });
  });

  it('rejects when practitioner profile is missing in self-scope resolution', async () => {
    findByUserIdMock.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'user_missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
