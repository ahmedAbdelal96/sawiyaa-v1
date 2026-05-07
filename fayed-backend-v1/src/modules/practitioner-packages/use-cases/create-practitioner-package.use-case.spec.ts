import { ConflictException } from '@nestjs/common';
import { SessionMode, PackageSchedulePolicy, PractitionerPackageStatus } from '@prisma/client';
import { CreatePractitionerPackageDto } from '../dto/create-practitioner-package.dto';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PackageLimitPolicy } from '../policies/package-limit.policy';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { ValidatePractitionerPackageService } from '../services/validate-practitioner-package.service';
import { CreatePractitionerPackageUseCase } from './create-practitioner-package.use-case';

describe('CreatePractitionerPackageUseCase', () => {
  const practitionerPackageRepository = {
    findPractitionerProfileByUserId: jest.fn(),
    countNonArchivedByPractitionerId: jest.fn(),
    findByPractitionerIdAndSlug: jest.fn(),
    createDraft: jest.fn(),
  } as unknown as PractitionerPackageRepository;

  const packageLimitPolicy = {
    assertCanCreatePackage: jest.fn(),
  } as unknown as PackageLimitPolicy;

  const validatePractitionerPackageService = {
    validateDraft: jest.fn(),
  } as unknown as ValidatePractitionerPackageService;

  const practitionerPackagePresenter = {
    toDetail: jest.fn(),
  } as unknown as PractitionerPackagePresenter;

  const useCase = new CreatePractitionerPackageUseCase(
    practitionerPackageRepository,
    packageLimitPolicy,
    validatePractitionerPackageService,
    practitionerPackagePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a draft package', async () => {
    (practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock).mockResolvedValue(
      {
        id: 'practitioner-1',
        status: 'APPROVED',
        acceptsPackages: true,
      },
    );
    (packageLimitPolicy.assertCanCreatePackage as jest.Mock).mockResolvedValue({
      maxNonArchivedPackages: 4,
      currentNonArchivedPackages: 1,
    });
    (practitionerPackageRepository.findByPractitionerIdAndSlug as jest.Mock).mockResolvedValue(
      null,
    );
    (practitionerPackageRepository.createDraft as jest.Mock).mockResolvedValue({
      id: 'package-1',
      practitionerId: 'practitioner-1',
      slug: 'starter-package',
      title: 'Starter Package',
      description: null,
      sessionCount: 8,
      sessionDurationMinutes: 30,
      sessionMode: SessionMode.VIDEO,
      priceEgp: 1200,
      priceUsd: 40,
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
    (practitionerPackagePresenter.toDetail as jest.Mock).mockReturnValue({
      id: 'package-1',
    });

    const result = await useCase.execute({
      userId: 'user-1',
      payload: {
        title: 'Starter Package',
        description: 'A good starter package',
        sessionCount: 8,
        sessionDurationMinutes: 30,
        sessionMode: SessionMode.VIDEO,
        priceEgp: 1200,
        priceUsd: 40,
        schedulePolicy:
          PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
      } as CreatePractitionerPackageDto,
    });

    expect(validatePractitionerPackageService.validateDraft).toHaveBeenCalled();
    expect(practitionerPackageRepository.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        practitionerId: 'practitioner-1',
        slug: 'starter-package',
        status: PractitionerPackageStatus.DRAFT,
        version: 1,
      }),
    );
    expect(result.item).toEqual({ id: 'package-1' });
  });

  it('blocks creation when the limit is reached', async () => {
    (practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock).mockResolvedValue(
      {
        id: 'practitioner-1',
        status: 'APPROVED',
        acceptsPackages: true,
      },
    );
    (packageLimitPolicy.assertCanCreatePackage as jest.Mock).mockRejectedValue(
      new ConflictException(),
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        payload: {
          title: 'Starter Package',
          sessionCount: 8,
          sessionDurationMinutes: 30,
          sessionMode: SessionMode.VIDEO,
          priceEgp: 1200,
          priceUsd: 40,
        } as CreatePractitionerPackageDto,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
