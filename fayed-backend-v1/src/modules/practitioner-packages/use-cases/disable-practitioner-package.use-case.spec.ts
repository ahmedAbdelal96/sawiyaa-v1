import { ConflictException } from '@nestjs/common';
import { PractitionerPackageStatus } from '@prisma/client';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { DisablePractitionerPackageUseCase } from './disable-practitioner-package.use-case';

describe('DisablePractitionerPackageUseCase', () => {
  const practitionerPackageRepository = {
    findAdminById: jest.fn(),
    disableById: jest.fn(),
  } as unknown as PractitionerPackageRepository;

  const practitionerPackagePresenter = {
    toDetail: jest.fn((value) => value),
  } as unknown as PractitionerPackagePresenter;

  const useCase = new DisablePractitionerPackageUseCase(
    practitionerPackageRepository,
    practitionerPackagePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables an active package and preserves prior state', async () => {
    (practitionerPackageRepository.findAdminById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.ACTIVE,
      statusBeforeAdminDisable: null,
      archivedAt: null,
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-example',
        status: 'APPROVED',
        acceptsPackages: true,
        user: { displayName: 'Dr Example', status: 'ACTIVE' },
      },
    });
    (practitionerPackageRepository.disableById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
      statusBeforeAdminDisable: PractitionerPackageStatus.ACTIVE,
      archivedAt: null,
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-example',
        status: 'APPROVED',
        acceptsPackages: true,
        user: { displayName: 'Dr Example', status: 'ACTIVE' },
      },
    });

    const result = await useCase.execute({ packageId: 'package-1' });

    expect(practitionerPackageRepository.disableById).toHaveBeenCalledWith(
      'package-1',
      expect.objectContaining({
        status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
        statusBeforeAdminDisable: PractitionerPackageStatus.ACTIVE,
      }),
    );
    expect(result.item.status).toBe(PractitionerPackageStatus.DISABLED_BY_ADMIN);
  });

  it('rejects archived packages', async () => {
    (practitionerPackageRepository.findAdminById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.ARCHIVED,
      archivedAt: new Date(),
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-example',
        status: 'APPROVED',
        acceptsPackages: true,
        user: { displayName: 'Dr Example', status: 'ACTIVE' },
      },
    });

    await expect(useCase.execute({ packageId: 'package-1' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
