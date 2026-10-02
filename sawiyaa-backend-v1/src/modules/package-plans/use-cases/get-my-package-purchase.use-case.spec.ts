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
  const professionalContentRepository = {
    findByPractitionerProfileId: jest.fn(),
  } as never;
  const professionalContentResolver = {
    resolve: jest.fn(),
  } as never;

  const useCase = new GetMyPackagePurchaseUseCase(
    patientProfileRepository,
    packagePurchaseRepository,
    packagePurchasePresenter,
    professionalContentRepository,
    professionalContentResolver,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (
      professionalContentRepository.findByPractitionerProfileId as jest.Mock
    ).mockResolvedValue(null);
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

  it('returns the patient-owned package purchase only', async () => {
    (patientProfileRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (
      packagePurchaseRepository.findByIdForPatient as jest.Mock
    ).mockResolvedValue({
      id: 'purchase-1',
      practitionerId: 'practitioner-1',
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
    expect(
      professionalContentRepository.findByPractitionerProfileId,
    ).toHaveBeenCalledWith('practitioner-1');
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
