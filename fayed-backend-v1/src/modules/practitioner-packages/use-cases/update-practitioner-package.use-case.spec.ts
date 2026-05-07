import { SessionMode, PackageSchedulePolicy } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PractitionerPackageStatus } from '@prisma/client';
import { PractitionerPackagePresenter } from '../presenters/practitioner-package.presenter';
import { PractitionerPackageRepository } from '../repositories/practitioner-package.repository';
import { ValidatePractitionerPackageService } from '../services/validate-practitioner-package.service';
import { UpdatePractitionerPackageUseCase } from './update-practitioner-package.use-case';

describe('UpdatePractitionerPackageUseCase', () => {
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

  const useCase = new UpdatePractitionerPackageUseCase(
    practitionerPackageRepository,
    validatePractitionerPackageService,
    practitionerPackagePresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('increments version when customer-facing fields change', async () => {
    (practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock).mockResolvedValue(
      { id: 'practitioner-1' },
    );
    (practitionerPackageRepository.findByIdAndPractitionerId as jest.Mock).mockResolvedValue(
      {
        id: 'package-1',
        practitionerId: 'practitioner-1',
        slug: 'starter-package',
        title: 'Starter Package',
        description: 'Old description',
        sessionCount: 8,
        sessionDurationMinutes: 30,
        sessionMode: SessionMode.VIDEO,
        priceEgp: new Prisma.Decimal(1200),
        priceUsd: new Prisma.Decimal(40),
        status: 'DRAFT',
        schedulePolicy: PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
        version: 1,
        activatedAt: null,
        pausedAt: null,
        disabledAt: null,
        archivedAt: null,
        createdAt: new Date('2026-05-02T10:00:00.000Z'),
        updatedAt: new Date('2026-05-02T10:00:00.000Z'),
        _count: { purchases: 0, sessions: 0 },
      },
    );
    (practitionerPackageRepository.updateById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      version: 2,
      _count: { purchases: 0, sessions: 0 },
    });
    (practitionerPackagePresenter.toDetail as jest.Mock).mockReturnValue({
      id: 'package-1',
      version: 2,
    });

    const result = await useCase.execute({
      userId: 'user-1',
      packageId: 'package-1',
      payload: {
        title: 'Starter Package v2',
        description: 'New description',
        sessionCount: 8,
        sessionDurationMinutes: 30,
        sessionMode: SessionMode.VIDEO,
        priceEgp: 1500,
        priceUsd: 50,
        schedulePolicy:
          PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
      },
    });

    expect(validatePractitionerPackageService.validateDraft).toHaveBeenCalled();
    expect(practitionerPackageRepository.updateById).toHaveBeenCalledWith(
      'package-1',
      expect.objectContaining({
        version: 2,
      }),
    );
    expect(result.item).toEqual({ id: 'package-1', version: 2 });
  });

  it('keeps version stable when no customer-facing field changed', async () => {
    (practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock).mockResolvedValue(
      { id: 'practitioner-1' },
    );
    (practitionerPackageRepository.findByIdAndPractitionerId as jest.Mock).mockResolvedValue(
      {
        id: 'package-1',
        practitionerId: 'practitioner-1',
        slug: 'starter-package',
        title: 'Starter Package',
        description: 'Old description',
        sessionCount: 8,
        sessionDurationMinutes: 30,
        sessionMode: SessionMode.VIDEO,
        priceEgp: new Prisma.Decimal(1200),
        priceUsd: new Prisma.Decimal(40),
        status: 'DRAFT',
        schedulePolicy: PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
        version: 1,
        activatedAt: null,
        pausedAt: null,
        disabledAt: null,
        archivedAt: null,
        createdAt: new Date('2026-05-02T10:00:00.000Z'),
        updatedAt: new Date('2026-05-02T10:00:00.000Z'),
        _count: { purchases: 0, sessions: 0 },
      },
    );
    (practitionerPackageRepository.updateById as jest.Mock).mockResolvedValue({
      id: 'package-1',
      version: 1,
      _count: { purchases: 0, sessions: 0 },
    });
    (practitionerPackagePresenter.toDetail as jest.Mock).mockReturnValue({
      id: 'package-1',
      version: 1,
    });

    await useCase.execute({
      userId: 'user-1',
      packageId: 'package-1',
      payload: {},
    });

    expect(practitionerPackageRepository.updateById).toHaveBeenCalledWith(
      'package-1',
      expect.objectContaining({
        version: 1,
      }),
    );
  });

  it('rejects updates on packages disabled by admin', async () => {
    (practitionerPackageRepository.findPractitionerProfileByUserId as jest.Mock).mockResolvedValue(
      { id: 'practitioner-1' },
    );
    (practitionerPackageRepository.findByIdAndPractitionerId as jest.Mock).mockResolvedValue(
      {
        id: 'package-1',
        practitionerId: 'practitioner-1',
        slug: 'starter-package',
        title: 'Starter Package',
        description: 'Old description',
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
      },
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        packageId: 'package-1',
        payload: { title: 'Changed' },
      }),
    ).rejects.toBeDefined();
  });
});
