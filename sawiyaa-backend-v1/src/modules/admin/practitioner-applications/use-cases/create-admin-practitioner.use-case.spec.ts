import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from '@common/i18n/services/i18n.service';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  CredentialReviewStatus,
  PractitionerApplicationStatus,
  PractitionerPayoutMethodType,
  PractitionerStatus,
  PractitionerType,
  UserStatus,
} from '@prisma/client';
import { PractitionerApplicationCompletionService } from '@modules/practitioners/services/practitioner-application-completion.service';
import { PractitionerApplicationSnapshotService } from '@modules/practitioners/services/practitioner-application-snapshot.service';
import { PractitionerPayoutDestinationValidationService } from '@modules/practitioners/services/practitioner-payout-destination-validation.service';
import { PractitionerSpecialtyIntegrityService } from '@modules/practitioners/services/practitioner-specialty-integrity.service';
import { PractitionerApplicationsAdminMapper } from '../mappers/practitioner-applications-admin.mapper';
import { CreateAdminPractitionerUseCase } from './create-admin-practitioner.use-case';
import { PhoneNumberValidationService } from '@common/validation/phone-number-validation.service';

describe('CreateAdminPractitionerUseCase', () => {
  const baseInput = {
    locale: 'en' as const,
    adminUserId: 'admin-1',
    email: 'new.practitioner@example.com',
    phone: '01012345678',
    phoneCountryCode: 'EG',
    password: 'StrongP@ssw0rd',
    displayName: 'Dr. Nour',
    practitionerType: PractitionerType.PSYCHOLOGIST,
    practitionerGender: null,
    professionalTitle: 'Clinical Psychologist',
    bio: 'Experienced psychologist focused on anxiety support.',
    yearsOfExperience: 6,
    countryCode: 'EG',
    languageCodes: ['ar', 'en'],
    specialtySelection: {
      primarySpecialtyCategoryId: 'cat-1',
      specialtyIds: ['spec-1', 'spec-2'],
    },
    payoutDestination: {
      methodType: PractitionerPayoutMethodType.BANK_ACCOUNT,
      accountHolderName: 'Dr. Nour',
      bankName: 'Bank',
      bankAccountNumber: '123456789',
      iban: null,
      walletProvider: null,
      walletIdentifier: null,
      otherDetails: null,
    },
    credentials: [
      {
        credentialType: 'DEGREE' as const,
        fileUrl:
          '/uploads/practitioners/admin-direct-create/credentials/degree.pdf',
      },
      {
        credentialType: 'PASSPORT' as const,
        fileUrl:
          '/uploads/practitioners/admin-direct-create/credentials/passport.pdf',
      },
    ],
    note: 'Created by admin ops',
  };

  const makeSut = (overrides?: {
    completionBlockers?: Array<{
      code: string;
      field: string;
      messageKey: string;
    }>;
    existingEmail?: boolean;
    countryRecord?: { id: string; isActive: boolean } | null;
    activeCountriesCount?: number;
  }) => {
    const tx = {
      user: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', status: UserStatus.ACTIVE }),
      },
      userRole: { create: jest.fn().mockResolvedValue({}) },
      userEmail: { create: jest.fn().mockResolvedValue({}) },
      userPhone: { upsert: jest.fn().mockResolvedValue({}) },
      authIdentity: { create: jest.fn().mockResolvedValue({}) },
      twoFactorSetting: { upsert: jest.fn().mockResolvedValue({}) },
      practitionerProfile: {
        create: jest.fn().mockResolvedValue({
          id: 'profile-1',
          status: PractitionerStatus.APPROVED,
        }),
      },
      practitionerProfileLanguage: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      practitionerSpecialty: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      practitionerPayoutDestination: {
        create: jest.fn().mockResolvedValue({}),
      },
      practitionerCredential: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      practitionerApplication: {
        create: jest.fn().mockResolvedValue({
          id: 'app-1',
          status: PractitionerApplicationStatus.APPROVED,
          reviewedAt: new Date('2026-06-14T00:00:00.000Z'),
          reviewedByUserId: 'admin-1',
          reviewDecisionReason: 'ADMIN_DIRECT_CREATE',
          reviewNotes: '[ADMIN_DIRECT_CREATE:admin-1] Created by admin ops',
        }),
      },
    };

    const prisma = {
      userEmail: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            overrides?.existingEmail ? { id: 'existing' } : null,
          ),
      },
      country: {
        count: jest
          .fn()
          .mockResolvedValue(overrides?.activeCountriesCount ?? 1),
        findFirst: jest
          .fn()
          .mockResolvedValue(
            overrides && 'countryRecord' in overrides
              ? overrides.countryRecord
              : { id: 'country-1', isActive: true },
          ),
      },
      language: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'lang-1', code: 'ar' },
          { id: 'lang-2', code: 'en' },
        ]),
      },
      specialty: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'spec-1',
            slug: 'clinical-psychology',
            categoryId: 'cat-1',
            translations: [{ locale: 'en', title: 'Clinical psychology' }],
          },
          {
            id: 'spec-2',
            slug: 'anxiety',
            categoryId: 'cat-1',
            translations: [{ locale: 'en', title: 'Anxiety' }],
          },
        ]),
      },
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        return callback(tx);
      }),
    } as unknown as PrismaService;

    const configService = {
      get: jest.fn().mockReturnValue(4),
    } as unknown as ConfigService;

    const i18nService = {
      t: jest.fn().mockReturnValue('created'),
    } as unknown as I18nService;

    const mapper = {
      toDecision: jest.fn().mockImplementation((value) => value),
    } as unknown as PractitionerApplicationsAdminMapper;

    const specialtyIntegrity = {
      validateSelection: jest.fn().mockResolvedValue(undefined),
    } as unknown as PractitionerSpecialtyIntegrityService;

    const payoutValidation = {
      validate: jest.fn(),
    } as unknown as PractitionerPayoutDestinationValidationService;

    const snapshotService = {
      build: jest.fn().mockReturnValue({}),
    } as unknown as PractitionerApplicationSnapshotService;

    const completionService = {
      build: jest.fn().mockReturnValue({
        blockers: overrides?.completionBlockers ?? [],
      }),
    } as unknown as PractitionerApplicationCompletionService;
    const phoneNumberValidationService = {
      assertValid: jest.fn().mockReturnValue({ e164: '+201012345678' }),
    } as unknown as PhoneNumberValidationService;
    const userPhoneRepository = {
      upsertPrimaryPhone: jest.fn(),
    } as any;

    const sut = new CreateAdminPractitionerUseCase(
      prisma,
      configService,
      i18nService,
      mapper,
      specialtyIntegrity,
      payoutValidation,
      snapshotService,
      completionService,
      phoneNumberValidationService,
      userPhoneRepository,
    );

    return {
      sut,
      prisma,
      tx,
      completionService,
    };
  };

  it('rejects duplicate emails before any writes', async () => {
    const { sut } = makeSut({ existingEmail: true });

    await expect(sut.execute(baseInput)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects direct create when approval requirements are missing', async () => {
    const { sut } = makeSut({
      completionBlockers: [
        {
          code: 'QUALIFICATIONS_ACADEMIC_CERTIFICATE_REQUIRED',
          field: 'credentials.degree',
          messageKey:
            'practitioners.application.completion.qualifications.academicCertificateRequired',
        },
      ],
    });

    await expect(sut.execute(baseInput)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates approved practitioner artifacts with approved credentials', async () => {
    const { sut, tx } = makeSut();

    const result = await sut.execute(baseInput);

    expect(tx.practitionerCredential.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          credentialType: 'DEGREE',
          reviewStatus: CredentialReviewStatus.APPROVED,
          reviewedByUserId: 'admin-1',
        }),
      ]),
    });
    expect(result.practitioner).toEqual(
      expect.objectContaining({
        practitionerProfileId: 'profile-1',
        userId: 'user-1',
        accountStatus: UserStatus.ACTIVE,
        practitionerStatus: PractitionerStatus.APPROVED,
        passwordRotationFollowUpRequired: true,
      }),
    );
  });

  it('returns COUNTRY_NOT_FOUND when submitted country does not exist', async () => {
    const { sut, prisma } = makeSut({ countryRecord: null });

    await expect(sut.execute(baseInput)).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'COUNTRY_NOT_FOUND',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'countryCode',
            code: 'COUNTRY_NOT_FOUND',
          }),
        ]),
      }),
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns COUNTRY_INACTIVE when submitted country is inactive', async () => {
    const { sut, prisma } = makeSut({
      countryRecord: { id: 'country-1', isActive: false },
    });

    await expect(sut.execute(baseInput)).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'COUNTRY_INACTIVE',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'countryCode',
            code: 'COUNTRY_INACTIVE',
          }),
        ]),
      }),
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns REFERENCE_DATA_MISSING when no active countries exist', async () => {
    const { sut, prisma } = makeSut({ activeCountriesCount: 0 });

    await expect(sut.execute(baseInput)).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'REFERENCE_DATA_MISSING',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'countryCode',
            code: 'REFERENCE_DATA_MISSING',
          }),
        ]),
      }),
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
