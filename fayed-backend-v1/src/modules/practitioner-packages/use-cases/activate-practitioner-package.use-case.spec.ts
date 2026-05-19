import { ConflictException } from '@nestjs/common';
import {
  PractitionerStatus,
  PractitionerPackageStatus,
  SessionMode,
  PackageSchedulePolicy,
  Prisma,
} from '@prisma/client';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { ValidatePractitionerPackageService } from '../services/validate-practitioner-package.service';
import { ActivatePractitionerPackageUseCase } from './activate-practitioner-package.use-case';

describe('ActivatePractitionerPackageUseCase', () => {
  const practitionerPackageRepository = {
    findPractitionerProfileByUserId: jest.fn(),
    findByIdAndPractitionerId: jest.fn(),
    updateById: jest.fn(),
  } as unknown as PractitionerPackageRepository;

  const validatePractitionerPackageService = {
    validateDraft: jest.fn(),
  } as unknown as ValidatePractitionerPackageService;

  const practitionerPackagePresenter = {
    toDetail: jest.fn(),
  } as unknown as PractitionerPackagePresenter;

  const useCase = new ActivatePractitionerPackageUseCase(
    practitionerPackageRepository,
    validatePractitionerPackageService,
    practitionerPackagePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires acceptsPackages to be true before activation', async () => {
    (
      practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'practitioner-1',
      status: PractitionerStatus.APPROVED,
      acceptsPackages: false,
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        packageId: 'package-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects activation when the package is disabled by admin', async () => {
    (
      practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'practitioner-1',
      status: PractitionerStatus.APPROVED,
      acceptsPackages: true,
    });
    (
      practitionerPackageRepository.findByIdAndPractitionerId as jest.Mock
    ).mockResolvedValue({
      id: 'package-1',
      practitionerId: 'practitioner-1',
      slug: 'starter-package',
      title: 'Starter Package',
      description: null,
      sessionCount: 8,
      sessionDurationMinutes: 30,
      sessionMode: SessionMode.VIDEO,
      priceEgp: new Prisma.Decimal(1200),
      priceUsd: new Prisma.Decimal(40),
      status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
      schedulePolicy: PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
      version: 1,
      activatedAt: null,
      pausedAt: null,
      disabledAt: new Date(),
      archivedAt: null,
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      updatedAt: new Date('2026-05-02T10:00:00.000Z'),
      _count: { purchases: 0, sessions: 0 },
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        packageId: 'package-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('activates a package when the practitioner accepts packages', async () => {
    (
      practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'practitioner-1',
      status: PractitionerStatus.APPROVED,
      acceptsPackages: true,
    });
    (
      practitionerPackageRepository.findByIdAndPractitionerId as jest.Mock
    ).mockResolvedValue({
      id: 'package-1',
      practitionerId: 'practitioner-1',
      slug: 'starter-package',
      title: 'Starter Package',
      description: null,
      sessionCount: 8,
      sessionDurationMinutes: 30,
      sessionMode: SessionMode.VIDEO,
      priceEgp: new Prisma.Decimal(1200),
      priceUsd: new Prisma.Decimal(40),
      status: PractitionerPackageStatus.DRAFT,
      schedulePolicy: PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
      version: 1,
      activatedAt: null,
      pausedAt: null,
      disabledAt: null,
      archivedAt: null,
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      updatedAt: new Date('2026-05-02T10:00:00.000Z'),
      _count: { purchases: 0, sessions: 0 },
    });
    (practitionerPackageRepository.updateById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      status: PractitionerPackageStatus.ACTIVE,
      _count: { purchases: 0, sessions: 0 },
    });
    (practitionerPackagePresenter.toDetail as jest.Mock).mockReturnValue({
      id: 'package-1',
      status: PractitionerPackageStatus.ACTIVE,
    });

    const result = await useCase.execute({
      userId: 'user-1',
      packageId: 'package-1',
    });

    expect(validatePractitionerPackageService.validateDraft).toHaveBeenCalled();
    expect(practitionerPackageRepository.updateById).toHaveBeenCalledWith(
      'package-1',
      expect.objectContaining({
        status: PractitionerPackageStatus.ACTIVE,
      }),
    );
    expect(result.item).toEqual({
      id: 'package-1',
      status: PractitionerPackageStatus.ACTIVE,
    });
  });
});
