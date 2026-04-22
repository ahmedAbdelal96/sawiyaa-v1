import { NotFoundException } from '@nestjs/common';
import { FinancialOperationsMapper } from '../mappers/financial-operations.mapper';
import { FinancialOperationsPractitionerRepository } from '../repositories/financial-operations-practitioner.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { GetPractitionerWalletUseCase } from './get-practitioner-wallet.use-case';

describe('GetPractitionerWalletUseCase', () => {
  const practitionerRepository = {
    findByUserId: jest.fn(),
  } as unknown as FinancialOperationsPractitionerRepository;
  const walletRepository = {
    findByPractitionerId: jest.fn(),
  } as unknown as WalletRepository;
  const financialOperationsMapper = {
    toWallet: jest.fn((input) => input),
  } as unknown as FinancialOperationsMapper;

  const useCase = new GetPractitionerWalletUseCase(
    practitionerRepository,
    walletRepository,
    financialOperationsMapper,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns explicit default zero wallet state when no wallet rows exist', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'pract_1',
    });
    (walletRepository.findByPractitionerId as jest.Mock).mockResolvedValue([]);

    const result = await useCase.execute({ userId: 'user_1' });

    expect(result.item).toEqual({
      currency: 'EGP',
      pendingBalance: '0.00',
      availableBalance: '0.00',
      reservedBalance: '0.00',
      totalEarned: '0.00',
      lifetimePaidOut: '0.00',
      lastLedgerEntryAt: null,
      updatedAt: null,
    });
  });

  it('rejects when practitioner profile is missing in self-scope resolution', async () => {
    (practitionerRepository.findByUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'user_missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
