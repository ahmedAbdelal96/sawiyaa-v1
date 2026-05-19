import { ConflictException } from '@nestjs/common';
import { PractitionerApplicationStatus } from '@prisma/client';
import { SubmitPractitionerApplicationUseCase } from './submit-practitioner-application.use-case';

describe('SubmitPractitionerApplicationUseCase', () => {
  const prisma = {
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({} as never),
    ),
  } as never;
  const i18nService = {
    t: jest.fn((key: string) => key),
  } as never;
  const createPractitionerProfileUseCase = {
    execute: jest.fn(),
  } as never;
  const practitionerApplicationRepository = {
    findLatestByPractitionerId: jest.fn(),
    resubmit: jest.fn(),
    createSubmitted: jest.fn(),
  } as never;
  const practitionerProfileRepository = {
    findByUserId: jest.fn(),
  } as never;
  const practitionerUserRepository = {
    findProfileSeed: jest.fn(),
  } as never;
  const practitionerLanguageRepository = {
    listCodesByPractitionerId: jest.fn(),
  } as never;
  const specialtyRepository = {
    listByPractitionerId: jest.fn(),
  } as never;
  const practitionerCredentialRepository = {
    listByPractitionerId: jest.fn(),
  } as never;
  const practitionerPayoutDestinationRepository = {
    findByPractitionerId: jest.fn(),
  } as never;
  const practitionerApplicationSnapshotService = {
    build: jest.fn(),
  } as never;
  const practitionerApplicationEligibilityPolicy = {
    evaluate: jest.fn(),
  } as never;
  const getPractitionerProfileReadinessUseCase = {
    evaluate: jest.fn(),
  } as never;
  const getPractitionerApplicationStatusUseCase = {
    execute: jest.fn(),
  } as never;

  const useCase = new SubmitPractitionerApplicationUseCase(
    prisma,
    i18nService,
    createPractitionerProfileUseCase,
    practitionerApplicationRepository,
    practitionerProfileRepository,
    practitionerUserRepository,
    practitionerLanguageRepository,
    specialtyRepository,
    practitionerCredentialRepository,
    practitionerPayoutDestinationRepository,
    practitionerApplicationSnapshotService,
    practitionerApplicationEligibilityPolicy,
    getPractitionerProfileReadinessUseCase,
    getPractitionerApplicationStatusUseCase,
  );

  const baseProfile = {
    id: 'profile-1',
    userId: 'user-1',
  };

  const currentUser = {
    id: 'user-1',
    isActive: true,
    isPractitionerOtpVerified: true,
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    (createPractitionerProfileUseCase.execute as jest.Mock).mockResolvedValue(
      baseProfile,
    );
    (practitionerProfileRepository.findByUserId as jest.Mock).mockResolvedValue(
      {
        ...baseProfile,
        practitionerType: 'THERAPIST',
        practitionerGender: null,
        professionalTitle: 'Psychologist',
        bio: 'Bio',
        yearsOfExperience: 5,
        country: { isoCode: 'EG' },
        sessionPrice30Egp: 250,
        sessionPrice30Usd: 8,
        sessionPrice60Egp: 450,
        sessionPrice60Usd: 15,
        primarySpecialtyCategoryId: 'primary',
      },
    );
    (practitionerUserRepository.findProfileSeed as jest.Mock).mockResolvedValue(
      {
        id: 'user-1',
        displayName: 'Dr. Nour',
        defaultLocale: 'ar',
        timezone: 'Africa/Cairo',
      },
    );
    (
      practitionerLanguageRepository.listCodesByPractitionerId as jest.Mock
    ).mockResolvedValue([{ language: { code: 'ar' } }]);
    (specialtyRepository.listByPractitionerId as jest.Mock).mockResolvedValue([
      {
        specialtyId: 'specialty-1',
        specialty: {
          slug: 'therapy',
          translations: [{ locale: 'ar', title: 'علاج' }],
          categoryId: 'primary',
        },
        isPrimary: true,
      },
    ]);
    (
      practitionerCredentialRepository.listByPractitionerId as jest.Mock
    ).mockResolvedValue([
      {
        id: 'cred-1',
        credentialType: 'LICENSE',
        fileUrl: 'https://example.com/license.pdf',
        reviewStatus: 'APPROVED',
        expiresAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        reviewedAt: new Date('2026-01-02T00:00:00.000Z'),
        reviewNotes: null,
      },
    ]);
    (
      practitionerPayoutDestinationRepository.findByPractitionerId as jest.Mock
    ).mockResolvedValue({
      methodType: 'BANK_ACCOUNT',
      accountHolderName: 'Dr. Nour',
      bankName: 'Bank',
      bankAccountNumber: '123456789',
      iban: null,
      walletProvider: null,
      walletIdentifier: null,
      otherDetails: null,
    });
    (practitionerApplicationSnapshotService.build as jest.Mock).mockReturnValue(
      {
        snapshot: true,
      },
    );
    (
      getPractitionerProfileReadinessUseCase.evaluate as jest.Mock
    ).mockResolvedValue({
      canSubmitApplication: true,
      isProfileCompleted: true,
      missingRequirements: [],
      checks: {},
      completion: {
        overallPercent: 100,
        canSubmit: true,
        blockers: [],
        warnings: [],
        steps: [],
      },
    });
    (
      practitionerApplicationEligibilityPolicy.evaluate as jest.Mock
    ).mockReturnValue({
      canSubmit: true,
      reason: null,
    });
    (
      getPractitionerApplicationStatusUseCase.execute as jest.Mock
    ).mockResolvedValue({
      application: {
        applicationId: 'app-status-1',
      },
    });
  });

  it('creates a submitted application when no prior application exists', async () => {
    (practitionerApplicationRepository.findLatestByPractitionerId as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'ar',
        currentUser,
        data: {
          displayName: 'Dr. Nour',
          locale: 'ar',
          timezone: 'Africa/Cairo',
        } as never,
      }),
    ).resolves.toMatchObject({
      message: 'practitioners.success.applicationSubmitted',
    });

    expect(
      practitionerApplicationRepository.createSubmitted,
    ).toHaveBeenCalled();
    expect(practitionerApplicationRepository.resubmit).not.toHaveBeenCalled();
  });

  it('resubmits when the latest application is changes requested', async () => {
    (practitionerApplicationRepository.findLatestByPractitionerId as jest.Mock)
      .mockResolvedValueOnce({
        id: 'application-1',
        status: PractitionerApplicationStatus.CHANGES_REQUESTED,
      })
      .mockResolvedValueOnce({
        id: 'application-1',
        status: PractitionerApplicationStatus.CHANGES_REQUESTED,
      });

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'ar',
        currentUser,
        data: {
          displayName: 'Dr. Nour',
          locale: 'ar',
          timezone: 'Africa/Cairo',
        } as never,
      }),
    ).resolves.toBeTruthy();

    expect(practitionerApplicationRepository.resubmit).toHaveBeenCalledWith(
      'application-1',
      expect.anything(),
      expect.anything(),
    );
    expect(
      practitionerApplicationRepository.createSubmitted,
    ).not.toHaveBeenCalled();
  });

  it('blocks resubmission when the latest application is approved', async () => {
    (practitionerApplicationRepository.findLatestByPractitionerId as jest.Mock)
      .mockResolvedValueOnce({
        id: 'application-1',
        status: PractitionerApplicationStatus.APPROVED,
      })
      .mockResolvedValueOnce({
        id: 'application-1',
        status: PractitionerApplicationStatus.APPROVED,
      });

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'ar',
        currentUser,
        data: {
          displayName: 'Dr. Nour',
          locale: 'ar',
          timezone: 'Africa/Cairo',
        } as never,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(practitionerApplicationRepository.resubmit).not.toHaveBeenCalled();
    expect(
      practitionerApplicationRepository.createSubmitted,
    ).not.toHaveBeenCalled();
  });
});
