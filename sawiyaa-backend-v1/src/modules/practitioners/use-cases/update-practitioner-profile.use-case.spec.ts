import { BadRequestException } from '@nestjs/common';
import { UpdatePractitionerProfileUseCase } from './update-practitioner-profile.use-case';

describe('UpdatePractitionerProfileUseCase', () => {
  const prisma = {
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({} as never),
    ),
  } as never;
  const i18nService = {
    t: jest.fn((key: string) => key),
  } as never;
  const configResolverService = {
    getBoolean: jest.fn(),
  } as never;
  const createPractitionerProfileUseCase = {
    execute: jest.fn(),
  } as never;
  const practitionerProfileRepository = {
    updateByUserId: jest.fn(),
  } as never;
  const practitionerUserRepository = {
    updateProfilePreferences: jest.fn(),
  } as never;
  const practitionerLanguageRepository = {
    replaceAll: jest.fn(),
  } as never;
  const practitionerPayoutDestinationRepository = {
    upsert: jest.fn(),
  } as never;
  const countryRepository = {
    findByIsoCode: jest.fn(),
  } as never;
  const languageRepository = {
    findActiveByCodes: jest.fn(),
  } as never;
  const practitionerPayoutDestinationValidationService = {
    validate: jest.fn(),
  } as never;
  const getPractitionerProfileUseCase = {
    execute: jest.fn(),
  } as never;

  const useCase = new UpdatePractitionerProfileUseCase(
    prisma,
    i18nService,
    configResolverService,
    createPractitionerProfileUseCase,
    practitionerProfileRepository,
    practitionerUserRepository,
    practitionerLanguageRepository,
    practitionerPayoutDestinationRepository,
    countryRepository,
    languageRepository,
    practitionerPayoutDestinationValidationService,
    getPractitionerProfileUseCase,
  );

  const baseProfile = {
    id: 'profile-1',
    userId: 'user-1',
    status: 'APPROVED',
    acceptsPackages: false,
    sessionPrice30Egp: '250.00',
    sessionPrice30Usd: '8.00',
    sessionPrice60Egp: '450.00',
    sessionPrice60Usd: '15.00',
    professionalTitle: null,
    bio: null,
    yearsOfExperience: null,
    practitionerType: 'OTHER',
    practitionerGender: null,
    primarySpecialtyCategoryId: null,
    payoutDestination: null,
    country: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const currentUser = {
    id: 'user-1',
    isActive: true,
    isPractitionerOtpVerified: true,
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    (configResolverService.getBoolean as jest.Mock).mockResolvedValue(true);
    (createPractitionerProfileUseCase.execute as jest.Mock).mockResolvedValue(
      baseProfile,
    );
    (
      practitionerProfileRepository.updateByUserId as jest.Mock
    ).mockResolvedValue(baseProfile);
    (
      practitionerUserRepository.updateProfilePreferences as jest.Mock
    ).mockResolvedValue({
      id: 'user-1',
      displayName: 'Dr. Yara',
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    });
    (getPractitionerProfileUseCase.execute as jest.Mock).mockResolvedValue({
      profile: { acceptsPackage: true },
    });
  });

  it('allows disabling package bookings', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'ar',
        currentUser,
        data: {
          acceptsPackage: false,
        },
      }),
    ).resolves.toBeTruthy();

    expect(practitionerProfileRepository.updateByUserId).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        acceptsPackages: false,
      }),
      expect.any(Object),
    );
  });

  it('allows enabling package bookings when the profile is ready', async () => {
    (createPractitionerProfileUseCase.execute as jest.Mock).mockResolvedValue({
      ...baseProfile,
      acceptsPackages: false,
      status: 'APPROVED',
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'ar',
        currentUser,
        data: {
          acceptsPackage: true,
        },
      }),
    ).resolves.toBeTruthy();

    expect(practitionerProfileRepository.updateByUserId).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        acceptsPackages: true,
      }),
      expect.any(Object),
    );
  });

  it('rejects enabling package bookings when prices are missing', async () => {
    (createPractitionerProfileUseCase.execute as jest.Mock).mockResolvedValue({
      ...baseProfile,
      sessionPrice30Usd: null,
      sessionPrice60Usd: null,
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'ar',
        currentUser,
        data: {
          acceptsPackage: true,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(practitionerProfileRepository.updateByUserId).not.toHaveBeenCalled();
  });

  it('rejects enabling package bookings when the profile is not approved', async () => {
    (createPractitionerProfileUseCase.execute as jest.Mock).mockResolvedValue({
      ...baseProfile,
      status: 'DRAFT',
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'ar',
        currentUser,
        data: {
          acceptsPackage: true,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(practitionerProfileRepository.updateByUserId).not.toHaveBeenCalled();
  });

  it('rejects enabling package bookings when package purchases are disabled globally', async () => {
    (configResolverService.getBoolean as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'ar',
        currentUser,
        data: {
          acceptsPackage: true,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(practitionerProfileRepository.updateByUserId).not.toHaveBeenCalled();
  });

  it('rejects invalid timezone input on profile update', async () => {
    await expect(
      useCase.execute({
        userId: 'user-1',
        locale: 'ar',
        currentUser,
        data: {
          timezone: '+02:00',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(practitionerProfileRepository.updateByUserId).not.toHaveBeenCalled();
    expect(practitionerUserRepository.updateProfilePreferences).not.toHaveBeenCalled();
  });
});
