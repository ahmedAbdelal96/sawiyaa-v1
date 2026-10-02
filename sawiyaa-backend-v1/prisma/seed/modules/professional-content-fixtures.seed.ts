import {
  ContentLocale,
  PractitionerComplianceState,
  PractitionerGender,
  PractitionerOperationalStatus,
  PractitionerStatus,
  PractitionerType,
  PrismaClient,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import { seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';

type FixtureTranslation = {
  locale: ContentLocale;
  professionalTitle: string | null;
  bio: string | null;
};

type ProfessionalContentFixture = {
  scenario: 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';
  userId: string;
  profileId: string;
  email: string;
  displayName: string;
  publicSlug: string;
  countryId: string;
  primarySpecialtyCategoryId: string;
  specialtyId: string;
  primaryContentLocale: ContentLocale | null;
  professionalTitle: string;
  bio: string;
  practitionerType: PractitionerType;
  practitionerGender: PractitionerGender;
  isPublicProfilePublished: boolean;
  status: PractitionerStatus;
  acceptsPackages: boolean;
  translations: FixtureTranslation[];
};

function deterministicUuid(seed: string): string {
  const hash = createHash('md5').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(
    13,
    16,
  )}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Dedicated development fixtures for BLOC-2F2. These are intentionally
 * separate from the existing practitioner demo accounts and never derive
 * authored content from arbitrary existing profiles.
 */
export const professionalContentFixtures: readonly ProfessionalContentFixture[] =
  [
    {
      scenario: 'S1',
      userId: seedIds.professionalContentFixtures.users.s1,
      profileId: seedIds.professionalContentFixtures.profiles.s1,
      email: 'bloc-2f2-s1@seed.sawiyaa.local',
      displayName: 'Localization Scenario One',
      publicSlug: 'dev-b2f2-s1-ar-primary',
      countryId: seedIds.countries.egypt,
      primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
      specialtyId: seedIds.specialties.familyCounseling,
      primaryContentLocale: ContentLocale.ar,
      professionalTitle: 'معالج أسري متقدم — BLOC2F2_AR_TITLE_S1',
      bio: 'متخصص في الإرشاد الأسري المتكامل — BLOC2F2_AR_BIO_S1',
      practitionerType: PractitionerType.COUNSELOR,
      practitionerGender: PractitionerGender.FEMALE,
      isPublicProfilePublished: true,
      status: PractitionerStatus.APPROVED,
      acceptsPackages: true,
      translations: [
        {
          locale: ContentLocale.ar,
          professionalTitle: 'معالج أسري متقدم — BLOC2F2_AR_TITLE_S1',
          bio: 'متخصص في الإرشاد الأسري المتكامل — BLOC2F2_AR_BIO_S1',
        },
        {
          locale: ContentLocale.en,
          professionalTitle: 'Advanced family therapist — BLOC2F2_EN_TITLE_S1',
          bio: 'Integrated family counseling — BLOC2F2_EN_BIO_S1',
        },
      ],
    },
    {
      scenario: 'S2',
      userId: seedIds.professionalContentFixtures.users.s2,
      profileId: seedIds.professionalContentFixtures.profiles.s2,
      email: 'bloc-2f2-s2@seed.sawiyaa.local',
      displayName: 'Localization Scenario Two',
      publicSlug: 'dev-b2f2-s2-en-primary',
      countryId: seedIds.countries.saudiArabia,
      primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
      specialtyId: seedIds.specialties.anxiety,
      primaryContentLocale: ContentLocale.en,
      professionalTitle:
        'Advanced relationship counselor — BLOC2F2_EN_TITLE_S2',
      bio: 'Relationship counselor supporting practical change — BLOC2F2_EN_BIO_S2',
      practitionerType: PractitionerType.COUNSELOR,
      practitionerGender: PractitionerGender.MALE,
      isPublicProfilePublished: true,
      status: PractitionerStatus.APPROVED,
      acceptsPackages: true,
      translations: [
        {
          locale: ContentLocale.ar,
          professionalTitle: 'أخصائي دعم أسري — BLOC2F2_AR_TITLE_S2',
          bio: 'متخصص في دعم العلاقات الأسرية — BLOC2F2_AR_BIO_S2',
        },
        {
          locale: ContentLocale.en,
          professionalTitle:
            'Advanced relationship counselor — BLOC2F2_EN_TITLE_S2',
          bio: 'Relationship counselor supporting practical change — BLOC2F2_EN_BIO_S2',
        },
      ],
    },
    {
      scenario: 'S3',
      userId: seedIds.professionalContentFixtures.users.s3,
      profileId: seedIds.professionalContentFixtures.profiles.s3,
      email: 'bloc-2f2-s3@seed.sawiyaa.local',
      displayName: 'Localization Scenario Three',
      publicSlug: 'dev-b2f2-s3-partial-secondary',
      countryId: seedIds.countries.uae,
      primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
      specialtyId: seedIds.specialties.familyCounseling,
      primaryContentLocale: ContentLocale.ar,
      professionalTitle: 'معالج أسري داعم — BLOC2F2_AR_TITLE_S3',
      bio: 'إرشاد أسري عملي وهادئ — BLOC2F2_AR_BIO_S3',
      practitionerType: PractitionerType.PSYCHOLOGIST,
      practitionerGender: PractitionerGender.FEMALE,
      isPublicProfilePublished: true,
      status: PractitionerStatus.APPROVED,
      acceptsPackages: true,
      translations: [
        {
          locale: ContentLocale.ar,
          professionalTitle: 'معالج أسري داعم — BLOC2F2_AR_TITLE_S3',
          bio: 'إرشاد أسري عملي وهادئ — BLOC2F2_AR_BIO_S3',
        },
        {
          locale: ContentLocale.en,
          professionalTitle: 'Family support specialist — BLOC2F2_EN_TITLE_S3',
          bio: null,
        },
      ],
    },
    {
      scenario: 'S4',
      userId: seedIds.professionalContentFixtures.users.s4,
      profileId: seedIds.professionalContentFixtures.profiles.s4,
      email: 'bloc-2f2-s4@seed.sawiyaa.local',
      displayName: 'Localization Scenario Four',
      publicSlug: 'dev-b2f2-s4-legacy-only',
      countryId: seedIds.countries.kuwait,
      primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
      specialtyId: seedIds.specialties.depression,
      primaryContentLocale: null,
      professionalTitle: 'مرشد نفسي داعم — BLOC2F2_LEGACY_TITLE_S4',
      bio: 'إرشاد نفسي شامل باللغة القديمة — BLOC2F2_LEGACY_BIO_S4',
      practitionerType: PractitionerType.COUNSELOR,
      practitionerGender: PractitionerGender.MALE,
      isPublicProfilePublished: true,
      status: PractitionerStatus.APPROVED,
      acceptsPackages: false,
      translations: [],
    },
    {
      scenario: 'S5',
      userId: seedIds.professionalContentFixtures.users.s5,
      profileId: seedIds.professionalContentFixtures.profiles.s5,
      email: 'bloc-2f2-s5@seed.sawiyaa.local',
      displayName: 'Localization Scenario Five',
      publicSlug: 'dev-b2f2-s5-non-public',
      countryId: seedIds.countries.qatar,
      primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
      specialtyId: seedIds.specialties.childPsychology,
      primaryContentLocale: ContentLocale.ar,
      professionalTitle: 'أخصائي دعم غير منشور — BLOC2F2_HIDDEN_AR_TITLE_S5',
      bio: 'محتوى تجريبي غير منشور — BLOC2F2_HIDDEN_AR_BIO_S5',
      practitionerType: PractitionerType.PSYCHOLOGIST,
      practitionerGender: PractitionerGender.FEMALE,
      isPublicProfilePublished: false,
      status: PractitionerStatus.PENDING_REVIEW,
      acceptsPackages: true,
      translations: [
        {
          locale: ContentLocale.ar,
          professionalTitle:
            'أخصائي دعم غير منشور — BLOC2F2_HIDDEN_AR_TITLE_S5',
          bio: 'محتوى تجريبي غير منشور — BLOC2F2_HIDDEN_AR_BIO_S5',
        },
        {
          locale: ContentLocale.en,
          professionalTitle:
            'Hidden support specialist — BLOC2F2_HIDDEN_EN_TITLE_S5',
          bio: 'Unpublished development content — BLOC2F2_HIDDEN_EN_BIO_S5',
        },
      ],
    },
    {
      scenario: 'S6',
      userId: seedIds.professionalContentFixtures.users.s6,
      profileId: seedIds.professionalContentFixtures.profiles.s6,
      email: 'bloc-2f2-s6@seed.sawiyaa.local',
      displayName: 'Localization Scenario Six',
      publicSlug: 'dev-b2f2-s6-dedup',
      countryId: seedIds.countries.egypt,
      primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
      specialtyId: seedIds.specialties.familyCounseling,
      primaryContentLocale: ContentLocale.ar,
      professionalTitle: 'متخصص في الإرشاد المتكامل — BLOC2F2_DEDUP_S6',
      bio: 'إرشاد أسري متكامل — BLOC2F2_DEDUP_S6',
      practitionerType: PractitionerType.COUNSELOR,
      practitionerGender: PractitionerGender.MALE,
      isPublicProfilePublished: true,
      status: PractitionerStatus.APPROVED,
      acceptsPackages: true,
      translations: [
        {
          locale: ContentLocale.ar,
          professionalTitle: 'متخصص في الإرشاد المتكامل — BLOC2F2_DEDUP_S6',
          bio: 'إرشاد أسري متكامل — BLOC2F2_DEDUP_S6',
        },
        {
          locale: ContentLocale.en,
          professionalTitle:
            'Integrated counseling specialist — BLOC2F2_DEDUP_S6',
          bio: 'Integrated family support — BLOC2F2_DEDUP_S6',
        },
      ],
    },
  ];

const fixturePricing = {
  sessionPrice30: '300',
  sessionPrice60: '550',
  sessionPrice30Egp: '300',
  sessionPrice30Usd: '18',
  sessionPrice60Egp: '550',
  sessionPrice60Usd: '33',
  instantBookingPrice30Egp: '360',
  instantBookingPrice30Usd: '22',
  instantBookingPrice60Egp: '660',
  instantBookingPrice60Usd: '40',
};

function isProductionLikeEnvironment(): boolean {
  const environment = (
    process.env.APP_ENV ??
    process.env.NODE_ENV ??
    'development'
  )
    .trim()
    .toLowerCase();

  return environment === 'production' || environment === 'staging';
}

async function seedFixtureUser(
  prisma: PrismaClient,
  fixture: ProfessionalContentFixture,
): Promise<void> {
  await prisma.user.upsert({
    where: { id: fixture.userId },
    create: {
      id: fixture.userId,
      displayName: fixture.displayName,
      status: UserStatus.ACTIVE,
      defaultLocale: fixture.primaryContentLocale ?? ContentLocale.ar,
      timezone: 'Africa/Cairo',
    },
    update: {
      displayName: fixture.displayName,
      status: UserStatus.ACTIVE,
      defaultLocale: fixture.primaryContentLocale ?? ContentLocale.ar,
      timezone: 'Africa/Cairo',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId: fixture.userId,
        role: UserRoleType.PRACTITIONER,
      },
    },
    create: {
      userId: fixture.userId,
      role: UserRoleType.PRACTITIONER,
    },
    update: {},
  });

  await prisma.userEmail.upsert({
    where: { email: fixture.email },
    create: {
      userId: fixture.userId,
      email: fixture.email,
      isPrimary: true,
      isVerified: true,
    },
    update: {
      userId: fixture.userId,
      isPrimary: true,
      isVerified: true,
    },
  });
}

async function seedFixtureProfile(
  prisma: PrismaClient,
  fixture: ProfessionalContentFixture,
): Promise<void> {
  await prisma.practitionerProfile.upsert({
    where: { id: fixture.profileId },
    create: {
      id: fixture.profileId,
      userId: fixture.userId,
      countryId: fixture.countryId,
      primarySpecialtyCategoryId: fixture.primarySpecialtyCategoryId,
      practitionerType: fixture.practitionerType,
      practitionerGender: fixture.practitionerGender,
      publicSlug: fixture.publicSlug,
      professionalTitle: fixture.professionalTitle,
      bio: fixture.bio,
      primaryContentLocale: fixture.primaryContentLocale,
      yearsOfExperience: 8,
      ...fixturePricing,
      isPublicProfilePublished: fixture.isPublicProfilePublished,
      status: fixture.status,
      operationalStatus: PractitionerOperationalStatus.ACTIVE,
      complianceState: PractitionerComplianceState.VERIFIED,
      isOnlineToggleEnabled: false,
      isInstantBookingEnabled: false,
      acceptsNormalBookings: true,
      acceptsPackages: fixture.acceptsPackages,
      preferredPayoutCurrencyCode: 'EGP',
    },
    update: {
      userId: fixture.userId,
      countryId: fixture.countryId,
      primarySpecialtyCategoryId: fixture.primarySpecialtyCategoryId,
      practitionerType: fixture.practitionerType,
      practitionerGender: fixture.practitionerGender,
      publicSlug: fixture.publicSlug,
      professionalTitle: fixture.professionalTitle,
      bio: fixture.bio,
      primaryContentLocale: fixture.primaryContentLocale,
      yearsOfExperience: 8,
      ...fixturePricing,
      isPublicProfilePublished: fixture.isPublicProfilePublished,
      status: fixture.status,
      operationalStatus: PractitionerOperationalStatus.ACTIVE,
      complianceState: PractitionerComplianceState.VERIFIED,
      isOnlineToggleEnabled: false,
      isInstantBookingEnabled: false,
      acceptsNormalBookings: true,
      acceptsPackages: fixture.acceptsPackages,
      preferredPayoutCurrencyCode: 'EGP',
    },
  });

  await prisma.practitionerProfileTranslation.deleteMany({
    where: {
      practitionerProfileId: fixture.profileId,
      ...(fixture.translations.length > 0
        ? { locale: { notIn: fixture.translations.map((item) => item.locale) } }
        : {}),
    },
  });

  for (const translation of fixture.translations) {
    await prisma.practitionerProfileTranslation.upsert({
      where: {
        practitionerProfileId_locale: {
          practitionerProfileId: fixture.profileId,
          locale: translation.locale,
        },
      },
      create: {
        id: deterministicUuid(
          `bloc-2f2-translation-${fixture.scenario}-${translation.locale}`,
        ),
        practitionerProfileId: fixture.profileId,
        locale: translation.locale,
        professionalTitle: translation.professionalTitle,
        bio: translation.bio,
      },
      update: {
        professionalTitle: translation.professionalTitle,
        bio: translation.bio,
      },
    });
  }

  await prisma.practitionerSpecialty.deleteMany({
    where: {
      practitionerId: fixture.profileId,
      specialtyId: { not: fixture.specialtyId },
    },
  });
  await prisma.practitionerSpecialty.upsert({
    where: {
      practitionerId_specialtyId: {
        practitionerId: fixture.profileId,
        specialtyId: fixture.specialtyId,
      },
    },
    create: {
      id: deterministicUuid(`bloc-2f2-specialty-${fixture.scenario}`),
      practitionerId: fixture.profileId,
      specialtyId: fixture.specialtyId,
      isPrimary: true,
    },
    update: { isPrimary: true },
  });

  await prisma.practitionerProfileLanguage.deleteMany({
    where: {
      practitionerId: fixture.profileId,
      languageId: {
        notIn: [seedIds.languages.arabic, seedIds.languages.english],
      },
    },
  });
  for (const [index, languageId] of [
    seedIds.languages.arabic,
    seedIds.languages.english,
  ].entries()) {
    await prisma.practitionerProfileLanguage.upsert({
      where: {
        practitionerId_languageId: {
          practitionerId: fixture.profileId,
          languageId,
        },
      },
      create: {
        id: deterministicUuid(
          `bloc-2f2-language-${fixture.scenario}-${languageId}`,
        ),
        practitionerId: fixture.profileId,
        languageId,
        isPrimary: index === 0,
      },
      update: { isPrimary: index === 0 },
    });
  }
}

export const professionalContentFixturesSeedModule: SeedModule = {
  name: 'professional-content-fixtures',
  async run(prisma: PrismaClient): Promise<void> {
    if (isProductionLikeEnvironment()) {
      console.log(
        '[seed:professional-content-fixtures] skipped outside development/test',
      );
      return;
    }

    for (const fixture of professionalContentFixtures) {
      await seedFixtureUser(prisma, fixture);
      await seedFixtureProfile(prisma, fixture);
    }

    console.log(
      `[seed:professional-content-fixtures] converged ${professionalContentFixtures.length} dedicated fixtures`,
    );
  },
};
