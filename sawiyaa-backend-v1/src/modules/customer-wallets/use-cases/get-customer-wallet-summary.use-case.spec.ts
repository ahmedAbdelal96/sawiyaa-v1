import { CustomerWalletPatientRepository } from '../repositories/customer-wallet-patient.repository';
import { CustomerWalletAccountingService } from '../services/customer-wallet-accounting.service';
import { GetCustomerWalletSummaryUseCase } from './get-customer-wallet-summary.use-case';

function wallet(id = 'wallet-1', currencyCode = 'EGP') {
  return {
    id,
    currencyCode,
    availableBalance: { toString: () => '0.00' },
    reservedBalance: { toString: () => '0.00' },
    lifetimeCredited: { toString: () => '0.00' },
    lifetimeDebited: { toString: () => '0.00' },
    lastEntryAt: null,
    createdAt: new Date('2026-08-22T10:00:00.000Z'),
    updatedAt: new Date('2026-08-22T10:00:00.000Z'),
  };
}

describe('GetCustomerWalletSummaryUseCase', () => {
  const patientRepository = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
  } as unknown as CustomerWalletPatientRepository;
  const accountingService = {
    getWalletSummary: jest.fn(),
    ensureWallet: jest.fn(),
  } as unknown as CustomerWalletAccountingService;
  const useCase = new GetCustomerWalletSummaryUseCase(
    patientRepository,
    accountingService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an existing wallet without creating another one', async () => {
    (patientRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      country: { currencyCode: 'EGP' },
    });
    (accountingService.getWalletSummary as jest.Mock).mockResolvedValue(
      wallet(),
    );

    const result = await useCase.execute({ userId: 'user-1' });

    expect(result.item).toMatchObject({ id: 'wallet-1', currencyCode: 'EGP' });
    expect(accountingService.ensureWallet).not.toHaveBeenCalled();
  });

  it('creates a missing legacy wallet idempotently using the patient country currency', async () => {
    (patientRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      country: { currencyCode: 'EGP' },
    });
    (accountingService.getWalletSummary as jest.Mock).mockResolvedValue(null);
    (accountingService.ensureWallet as jest.Mock).mockResolvedValue(
      wallet('wallet-created', 'EGP'),
    );

    const result = await useCase.execute({ userId: 'user-1' });

    expect(accountingService.ensureWallet).toHaveBeenCalledWith({
      patientId: 'patient-1',
      currencyCode: 'EGP',
    });
    expect(result.item).toMatchObject({
      id: 'wallet-created',
      currencyCode: 'EGP',
    });
  });

  it('honors an explicit supported currency when creating a missing wallet', async () => {
    (patientRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      country: { currencyCode: 'EGP' },
    });
    (accountingService.getWalletSummary as jest.Mock).mockResolvedValue(null);
    (accountingService.ensureWallet as jest.Mock).mockResolvedValue(
      wallet('wallet-created', 'USD'),
    );

    await useCase.execute({ userId: 'user-1', currencyCode: 'USD' });

    expect(accountingService.ensureWallet).toHaveBeenCalledWith({
      patientId: 'patient-1',
      currencyCode: 'USD',
    });
  });
});
