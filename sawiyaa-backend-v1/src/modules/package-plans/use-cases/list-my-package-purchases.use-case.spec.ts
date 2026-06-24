import { NotFoundException } from '@nestjs/common';
import { ListMyPackagePurchasesUseCase } from './list-my-package-purchases.use-case';

describe('ListMyPackagePurchasesUseCase', () => {
  const patientProfileRepository = {
    findByUserId: jest.fn(),
  } as never;
  const packagePurchaseRepository = {
    listByPatient: jest.fn(),
  } as never;
  const packagePurchasePresenter = {
    toViewModel: jest.fn((input: { purchase: { id: string } }) => ({
      id: input.purchase.id,
    })),
  } as never;

  const useCase = new ListMyPackagePurchasesUseCase(
    patientProfileRepository,
    packagePurchaseRepository,
    packagePurchasePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only the authenticated patient purchases', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (packagePurchaseRepository.listByPatient as jest.Mock).mockResolvedValue([
      [{ id: 'purchase-1' }, { id: 'purchase-2' }],
      2,
    ]);

    const result = await useCase.execute({
      userId: 'user-1',
      locale: 'en',
      query: { page: 1, limit: 20 },
    } as never);

    expect(result.items).toHaveLength(2);
    expect(result.pagination.totalItems).toBe(2);
    expect(packagePurchaseRepository.listByPatient).toHaveBeenCalledWith({
      patientId: 'patient-1',
      skip: 0,
      take: 20,
    });
  });

  it('fails when the patient profile is missing', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'en',
        query: { page: 1, limit: 20 },
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
