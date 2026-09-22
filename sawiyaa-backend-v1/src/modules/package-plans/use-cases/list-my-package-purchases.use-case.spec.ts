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
  const professionalContentRepository = {
    findByPractitionerProfileIds: jest.fn(),
  } as never;
  const professionalContentResolver = {
    resolve: jest.fn(),
  } as never;

  const useCase = new ListMyPackagePurchasesUseCase(
    patientProfileRepository,
    packagePurchaseRepository,
    packagePurchasePresenter,
    professionalContentRepository,
    professionalContentResolver,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (
      professionalContentRepository.findByPractitionerProfileIds as jest.Mock
    ).mockResolvedValue([]);
    (professionalContentResolver.resolve as jest.Mock).mockImplementation(
      ({
        legacyProfessionalTitle,
      }: {
        legacyProfessionalTitle?: string | null;
      }) => ({
        professionalTitle: legacyProfessionalTitle ?? null,
      }),
    );
  });

  it('lists only the authenticated patient purchases', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (packagePurchaseRepository.listByPatient as jest.Mock).mockResolvedValue([
      [
        { id: 'purchase-1', practitionerId: 'practitioner-1' },
        { id: 'purchase-2', practitionerId: 'practitioner-1' },
      ],
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
    expect(
      professionalContentRepository.findByPractitionerProfileIds,
    ).toHaveBeenCalledWith(['practitioner-1']);
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
