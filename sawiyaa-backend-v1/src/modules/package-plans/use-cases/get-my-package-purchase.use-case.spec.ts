import { NotFoundException } from '@nestjs/common';
import { GetMyPackagePurchaseUseCase } from './get-my-package-purchase.use-case';

describe('GetMyPackagePurchaseUseCase', () => {
  const patientProfileRepository = {
    findByUserId: jest.fn(),
  } as never;
  const packagePurchaseRepository = {
    findByIdForPatient: jest.fn(),
  } as never;
  const packagePurchasePresenter = {
    toViewModel: jest.fn((input: { purchase: { id: string } }) => ({
      id: input.purchase.id,
    })),
  } as never;

  const useCase = new GetMyPackagePurchaseUseCase(
    patientProfileRepository,
    packagePurchaseRepository,
    packagePurchasePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the patient-owned package purchase only', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (
      packagePurchaseRepository.findByIdForPatient as jest.Mock
    ).mockResolvedValue({
      id: 'purchase-1',
    });

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      purchaseId: 'purchase-1',
    });

    expect(result.item.id).toBe('purchase-1');
    expect(packagePurchaseRepository.findByIdForPatient).toHaveBeenCalledWith({
      purchaseId: 'purchase-1',
      patientId: 'patient-1',
    });
  });

  it('fails when another patient requests the purchase', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (
      packagePurchaseRepository.findByIdForPatient as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        purchaseId: 'purchase-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
