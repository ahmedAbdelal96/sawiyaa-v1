import { ConflictException } from '@nestjs/common';
import { PractitionerPackageStatus } from '@prisma/client';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { PausePractitionerPackageUseCase } from './pause-practitioner-package.use-case';

describe('PausePractitionerPackageUseCase', () => {
  const practitionerPackageRepository = {
    findPractitionerProfileByUserId: jest.fn(),
    findByIdAndPractitionerId: jest.fn(),
    updateById: jest.fn(),
  } as unknown as PractitionerPackageRepository;

  const practitionerPackagePresenter = {
    toDetail: jest.fn(),
  } as unknown as PractitionerPackagePresenter;

  const useCase = new PausePractitionerPackageUseCase(
    practitionerPackageRepository,
    practitionerPackagePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pauses an active package', async () => {
    (
      practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock
    ).mockResolvedValue({ id: 'practitioner-1' });
    (
      practitionerPackageRepository.findByIdAndPractitionerId as jest.Mock
    ).mockResolvedValue({
      id: 'package-1',
      practitionerId: 'practitioner-1',
      status: PractitionerPackageStatus.ACTIVE,
      archivedAt: null,
    });
    (practitionerPackageRepository.updateById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
      _count: { purchases: 0, sessions: 0 },
    });
    (practitionerPackagePresenter.toDetail as jest.Mock).mockReturnValue({
      id: 'package-1',
      status: PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
    });

    const result = await useCase.execute({
      userId: 'user-1',
      packageId: 'package-1',
    });

    expect(practitionerPackageRepository.updateById).toHaveBeenCalledWith(
      'package-1',
      expect.objectContaining({
        status: PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
      }),
    );
    expect(result.item.status).toBe(
      PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
    );
  });

  it('rejects pausing non-active packages', async () => {
    (
      practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock
    ).mockResolvedValue({ id: 'practitioner-1' });
    (
      practitionerPackageRepository.findByIdAndPractitionerId as jest.Mock
    ).mockResolvedValue({
      id: 'package-1',
      practitionerId: 'practitioner-1',
      status: PractitionerPackageStatus.DRAFT,
      archivedAt: null,
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        packageId: 'package-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects pausing packages disabled by admin', async () => {
    (
      practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock
    ).mockResolvedValue({ id: 'practitioner-1' });
    (
      practitionerPackageRepository.findByIdAndPractitionerId as jest.Mock
    ).mockResolvedValue({
      id: 'package-1',
      practitionerId: 'practitioner-1',
      status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
      archivedAt: null,
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        packageId: 'package-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
