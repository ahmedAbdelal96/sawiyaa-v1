import { ConflictException } from '@nestjs/common';
import { PractitionerPackageStatus, PractitionerStatus, UserStatus } from '@prisma/client';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { EnablePractitionerPackageUseCase } from './enable-practitioner-package.use-case';

describe('EnablePractitionerPackageUseCase', () => {
  const practitionerPackageRepository = {
    findAdminById: jest.fn(),
    enableById: jest.fn(),
  } as unknown as PractitionerPackageRepository;

  const practitionerPackagePresenter = {
    toDetail: jest.fn((value) => value),
  } as unknown as PractitionerPackagePresenter;

  const useCase = new EnablePractitionerPackageUseCase(
    practitionerPackageRepository,
    practitionerPackagePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restores the previous operational status when enabling', async () => {
    (practitionerPackageRepository.findAdminById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
      statusBeforeAdminDisable: PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
      archivedAt: null,
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-example',
        status: 'APPROVED',
        acceptsPackages: true,
        user: { displayName: 'Dr Example', status: 'ACTIVE' },
      },
    });
    (practitionerPackageRepository.enableById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
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

    const result = await useCase.execute({ packageId: 'package-1' });

    expect(practitionerPackageRepository.enableById).toHaveBeenCalledWith(
      'package-1',
      expect.objectContaining({
        status: PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
        disabledAt: null,
        disabledReason: null,
        statusBeforeAdminDisable: null,
      }),
    );
    expect(result.item.status).toBe(PractitionerPackageStatus.PAUSED_BY_PRACTITIONER);
  });

  it('fails safely when the previous status is missing', async () => {
    (practitionerPackageRepository.findAdminById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
      statusBeforeAdminDisable: null,
      archivedAt: null,
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-example',
        status: PractitionerStatus.APPROVED,
        acceptsPackages: true,
        user: { displayName: 'Dr Example', status: UserStatus.ACTIVE },
      },
    });

    await expect(useCase.execute({ packageId: 'package-1' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(practitionerPackageRepository.enableById).not.toHaveBeenCalled();
  });

  it('requires acceptsPackages to be true when restoring ACTIVE', async () => {
    (practitionerPackageRepository.findAdminById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
      statusBeforeAdminDisable: PractitionerPackageStatus.ACTIVE,
      archivedAt: null,
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-example',
        status: PractitionerStatus.APPROVED,
        acceptsPackages: false,
        user: { displayName: 'Dr Example', status: UserStatus.ACTIVE },
      },
    });

    await expect(useCase.execute({ packageId: 'package-1' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(practitionerPackageRepository.enableById).not.toHaveBeenCalled();
  });

  it('restores paused packages without rechecking acceptsPackages', async () => {
    (practitionerPackageRepository.findAdminById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
      statusBeforeAdminDisable: PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
      archivedAt: null,
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-example',
        status: PractitionerStatus.APPROVED,
        acceptsPackages: false,
        user: { displayName: 'Dr Example', status: UserStatus.ACTIVE },
      },
    });
    (practitionerPackageRepository.enableById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
      statusBeforeAdminDisable: null,
      archivedAt: null,
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-example',
        status: PractitionerStatus.APPROVED,
        acceptsPackages: false,
        user: { displayName: 'Dr Example', status: UserStatus.ACTIVE },
      },
    });

    const result = await useCase.execute({ packageId: 'package-1' });

    expect(practitionerPackageRepository.enableById).toHaveBeenCalledWith(
      'package-1',
      expect.objectContaining({
        status: PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
      }),
    );
    expect(result.item.status).toBe(PractitionerPackageStatus.PAUSED_BY_PRACTITIONER);
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

  it('rejects enabling packages that are not disabled by admin', async () => {
    (practitionerPackageRepository.findAdminById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.ACTIVE,
      statusBeforeAdminDisable: PractitionerPackageStatus.PAUSED_BY_PRACTITIONER,
      archivedAt: null,
      practitioner: {
        id: 'practitioner-1',
        publicSlug: 'dr-example',
        status: PractitionerStatus.APPROVED,
        acceptsPackages: true,
        user: { displayName: 'Dr Example', status: UserStatus.ACTIVE },
      },
    });

    await expect(useCase.execute({ packageId: 'package-1' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(practitionerPackageRepository.enableById).not.toHaveBeenCalled();
  });
});
