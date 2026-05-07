import { NotFoundException } from '@nestjs/common';
import { PractitionerPackageStatus } from '@prisma/client';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { ArchivePractitionerPackageUseCase } from './archive-practitioner-package.use-case';

describe('ArchivePractitionerPackageUseCase', () => {
  const practitionerPackageRepository = {
    findPractitionerProfileByUserId: jest.fn(),
    findByIdAndPractitionerId: jest.fn(),
    updateById: jest.fn(),
  } as unknown as PractitionerPackageRepository;

  const practitionerPackagePresenter = {
    toDetail: jest.fn(),
  } as unknown as PractitionerPackagePresenter;

  const useCase = new ArchivePractitionerPackageUseCase(
    practitionerPackageRepository,
    practitionerPackagePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('archives an active package softly', async () => {
    (practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock).mockResolvedValue(
      { id: 'practitioner-1' },
    );
    (practitionerPackageRepository.findByIdAndPractitionerId as jest.Mock).mockResolvedValue(
      {
        id: 'package-1',
        practitionerId: 'practitioner-1',
        status: PractitionerPackageStatus.ACTIVE,
        archivedAt: null,
      },
    );
    (practitionerPackageRepository.updateById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.ARCHIVED,
      archivedAt: new Date('2026-05-02T10:00:00.000Z'),
      _count: { purchases: 0, sessions: 0 },
    });
    (practitionerPackagePresenter.toDetail as jest.Mock).mockReturnValue({
      id: 'package-1',
      status: PractitionerPackageStatus.ARCHIVED,
    });

    const result = await useCase.execute({
      userId: 'user-1',
      packageId: 'package-1',
    });

    expect(practitionerPackageRepository.updateById).toHaveBeenCalledWith(
      'package-1',
      expect.objectContaining({
        status: PractitionerPackageStatus.ARCHIVED,
        archivedAt: expect.any(Date),
      }),
    );
    expect(result.item.status).toBe(PractitionerPackageStatus.ARCHIVED);
  });

  it('rejects archiving packages disabled by admin', async () => {
    (practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock).mockResolvedValue(
      { id: 'practitioner-1' },
    );
    (practitionerPackageRepository.findByIdAndPractitionerId as jest.Mock).mockResolvedValue(
      {
        id: 'package-1',
        practitionerId: 'practitioner-1',
        status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
        archivedAt: null,
      },
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        packageId: 'package-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
