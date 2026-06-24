import {
  AcademyEnrollmentStatus,
  AvailabilityWeekday,
  ConversationParticipantRole,
  ConversationStatus,
  ConversationType,
  CustomerWalletEntryDirection,
  CustomerWalletEntryType,
  CustomerWalletReservationStatus,
  CredentialReviewStatus,
  CredentialType,
  CourseStatus,
  CourseVisibility,
  AuthProvider,
  MessageStatus,
  MessageType,
  MessageVisibility,
  NotificationChannel,
  NotificationStatus,
  PackageSchedulePolicy,
  PackageSettlementStatus,
  PatientPackagePurchaseStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PractitionerApplicationStatus,
  PractitionerGender,
  PractitionerStatus,
  PractitionerType,
  PresenceStatus,
  PrismaClient,
  RefundDestination,
  RefundStatus,
  RefundType,
  SessionFlowType,
  SessionMode,
  SessionPaymentCoverageType,
  SessionProvider,
  SessionReviewStatus,
  SessionStatus,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import { seedCredentials, seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';
import { daysAgo, daysFromNow, hashPassword } from '../shared/seed.utils';

function uuid(seed: string): string {
  const h = createHash('md5').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function money(value: number): string {
  return value.toFixed(2);
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function buildSessionCode(seed: string): string {
  const digest = createHash('sha1').update(seed).digest('hex').slice(0, 10).toUpperCase();
  return `QA-${digest}`;
}

function practiceRegionCurrency(countryIsoCode: string | null): {
  currencyCode: 'EGP' | 'USD';
  provider: PaymentProvider;
} {
  return countryIsoCode === 'EG' || countryIsoCode === 'EGY'
    ? { currencyCode: 'EGP', provider: PaymentProvider.PAYMOB }
    : { currencyCode: 'USD', provider: PaymentProvider.STRIPE };
}

type CuratedSessionSeed = {
  id: string;
  sessionCode: string;
  patientId: string;
  practitionerId: string;
  flowType: SessionFlowType;
  sessionMode: SessionMode;
  durationMinutes: number;
  status: SessionStatus;
  requestedStartAt: Date;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  joinOpenAt: Date | null;
  expiresAt: Date | null;
  cancelledAt: Date | null;
  completedAt?: Date | null;
  provider: SessionProvider;
  providerRoomId: string | null;
  providerSessionRef: string | null;
  timezoneSnapshot: string | null;
  packagePurchaseId: string | null;
  packageSessionIndex: number | null;
  packageSessionCount: number | null;
  paymentCoverageType: SessionPaymentCoverageType;
};

type CuratedPaymentSeed = {
  id: string;
  sessionId?: string | null;
  patientId: string;
  practitionerId: string;
  paymentPurpose: PaymentPurpose;
  provider: PaymentProvider;
  status: PaymentStatus;
  amountSubtotal: string;
  amountDiscount: string;
  amountTotal: string;
  amountFromWallet: string;
  amountFromGateway: string;
  currencyCode: string;
  providerPaymentRef: string;
  providerOrderRef: string;
  providerCustomerRef: string;
  initiatedAt: Date;
  authorizedAt?: Date | null;
  capturedAt?: Date | null;
  failedAt?: Date | null;
};

export const curatedDevSeedModule: SeedModule = {
  name: 'curated-dev',
  async run(prisma: PrismaClient): Promise<void> {
    const supportUserId = seedIds.users.supportAgent;
    const adminUserId = seedIds.users.superAdmin;
    const reviewerUserId = seedIds.users.contentReviewer;
    const patientAUserId = seedIds.users.patientA;
    const patientBUserId = seedIds.users.patientB;
    const patientCUserId = seedIds.users.patientC;

    const userDisplaySeed = [
      { id: adminUserId, displayName: 'System Admin', timezone: 'Africa/Cairo' },
      { id: supportUserId, displayName: 'Support Agent', timezone: 'Africa/Cairo' },
      {
        id: reviewerUserId,
        displayName: 'Content Reviewer',
        timezone: 'Asia/Riyadh',
      },
      { id: patientAUserId, displayName: 'Ahmed Mahmoud', timezone: 'Africa/Cairo' },
      {
        id: patientBUserId,
        displayName: 'Mohamed Abdelfattah',
        timezone: 'Asia/Dubai',
      },
      { id: patientCUserId, displayName: 'Omar Kareem', timezone: 'Africa/Cairo' },
      {
        id: seedIds.users.practitionerA,
        displayName: 'Dr. Ahmed Mohamed',
        timezone: 'Africa/Cairo',
      },
      {
        id: seedIds.users.practitionerB,
        displayName: 'Dr. Mohamed Mahmoud',
        timezone: 'Asia/Riyadh',
      },
      {
        id: seedIds.users.practitionerC,
        displayName: 'Dr. Abdul Fattah Ali',
        timezone: 'Asia/Dubai',
      },
      {
        id: seedIds.users.practitionerD,
        displayName: 'Dr. Mahmoud El Sayed',
        timezone: 'Asia/Kuwait',
      },
      {
        id: seedIds.users.practitionerE,
        displayName: 'Dr. Youssef Abdallah',
        timezone: 'Africa/Cairo',
      },
      {
        id: seedIds.users.practitionerF,
        displayName: 'Dr. Karim Hassan',
        timezone: 'Asia/Riyadh',
      },
      {
        id: seedIds.users.practitionerG,
        displayName: 'Dr. Sara Khaled',
        timezone: 'Asia/Dubai',
      },
      {
        id: seedIds.users.practitionerH,
        displayName: 'Dr. Nour Hani',
        timezone: 'Asia/Kuwait',
      },
      {
        id: seedIds.users.practitionerI,
        displayName: 'Dr. Mariam Ashraf',
        timezone: 'Asia/Qatar',
      },
      {
        id: seedIds.users.practitionerJ,
        displayName: 'Dr. Hassan Tarek',
        timezone: 'Africa/Cairo',
      },
    ] as const;

    for (const user of userDisplaySeed) {
      await prisma.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          displayName: user.displayName,
          status: UserStatus.ACTIVE,
          defaultLocale: 'ar',
          timezone: user.timezone,
        },
        update: {
          displayName: user.displayName,
          status: UserStatus.ACTIVE,
          defaultLocale: 'ar',
          timezone: user.timezone,
        },
      });
    }

    const practitionerRows = [
      {
        userId: seedIds.users.practitionerA,
        profileId: seedIds.practitionerProfiles.practitionerA,
        countryId: seedIds.countries.egypt,
        primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
        practitionerType: PractitionerType.PSYCHOLOGIST,
        practitionerGender: PractitionerGender.MALE,
        publicSlug: 'dr-ahmed-mohamed',
        professionalTitle: 'Clinical psychologist',
        bio: 'Clinical psychologist focused on anxiety, stress, and mood support.',
        yearsOfExperience: 8,
        sessionPrice30: '300',
        sessionPrice60: '550',
        sessionPrice30Egp: '300',
        sessionPrice30Usd: '18',
        sessionPrice60Egp: '550',
        sessionPrice60Usd: '32',
        instantBookingPrice30Egp: null,
        instantBookingPrice30Usd: null,
        instantBookingPrice60Egp: null,
        instantBookingPrice60Usd: null,
        avatarUrl: 'https://files.local/practitioner-ahmed-avatar.jpg',
        coverImageUrl: 'https://files.local/practitioner-ahmed-cover.jpg',
        isPublicProfilePublished: false,
        status: PractitionerStatus.PENDING_REVIEW,
        isOnlineToggleEnabled: false,
        isInstantBookingEnabled: false,
        acceptsPackages: true,
      },
      {
        userId: seedIds.users.practitionerB,
        profileId: seedIds.practitionerProfiles.practitionerB,
        countryId: seedIds.countries.saudiArabia,
        primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
        practitionerType: PractitionerType.PSYCHIATRIST,
        practitionerGender: PractitionerGender.MALE,
        publicSlug: 'dr-mohamed-mahmoud',
        professionalTitle: 'Consultant psychiatrist',
        bio: 'Consultant psychiatrist with practical experience in diagnosis and long-term treatment planning.',
        yearsOfExperience: 14,
        sessionPrice30: '420',
        sessionPrice60: '760',
        sessionPrice30Egp: '420',
        sessionPrice30Usd: '25',
        sessionPrice60Egp: '760',
        sessionPrice60Usd: '45',
        instantBookingPrice30Egp: '520',
        instantBookingPrice30Usd: '31',
        instantBookingPrice60Egp: '940',
        instantBookingPrice60Usd: '56',
        avatarUrl: 'https://files.local/practitioner-mohamed-avatar.jpg',
        coverImageUrl: 'https://files.local/practitioner-mohamed-cover.jpg',
        isPublicProfilePublished: true,
        status: PractitionerStatus.APPROVED,
        isOnlineToggleEnabled: true,
        isInstantBookingEnabled: true,
        acceptsPackages: true,
      },
      {
        userId: seedIds.users.practitionerC,
        profileId: seedIds.practitionerProfiles.practitionerC,
        countryId: seedIds.countries.uae,
        primarySpecialtyCategoryId: seedIds.specialtyCategories.nutrition,
        practitionerType: PractitionerType.NUTRITIONIST,
        practitionerGender: PractitionerGender.FEMALE,
        publicSlug: 'dr-mahmoud-ali',
        professionalTitle: 'Clinical nutrition specialist',
        bio: 'Nutrition specialist focused on emotional eating and practical lifestyle planning.',
        yearsOfExperience: 6,
        sessionPrice30: '260',
        sessionPrice60: '480',
        sessionPrice30Egp: '260',
        sessionPrice30Usd: '16',
        sessionPrice60Egp: '480',
        sessionPrice60Usd: '28',
        instantBookingPrice30Egp: null,
        instantBookingPrice30Usd: null,
        instantBookingPrice60Egp: null,
        instantBookingPrice60Usd: null,
        avatarUrl: 'https://files.local/practitioner-mahmoud-avatar.jpg',
        coverImageUrl: 'https://files.local/practitioner-mahmoud-cover.jpg',
        isPublicProfilePublished: false,
        status: PractitionerStatus.REJECTED,
        isOnlineToggleEnabled: false,
        isInstantBookingEnabled: false,
        acceptsPackages: false,
      },
      {
        userId: seedIds.users.practitionerD,
        profileId: seedIds.practitionerProfiles.practitionerD,
        countryId: seedIds.countries.kuwait,
        primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
        practitionerType: PractitionerType.COUNSELOR,
        practitionerGender: PractitionerGender.MALE,
        publicSlug: 'dr-abdelfattah-ali',
        professionalTitle: 'Family counselor',
        bio: 'Family counselor focused on relationship repair and communication support.',
        yearsOfExperience: 7,
        sessionPrice30: '280',
        sessionPrice60: '520',
        sessionPrice30Egp: '280',
        sessionPrice30Usd: '17',
        sessionPrice60Egp: '520',
        sessionPrice60Usd: '30',
        instantBookingPrice30Egp: null,
        instantBookingPrice30Usd: null,
        instantBookingPrice60Egp: null,
        instantBookingPrice60Usd: null,
        avatarUrl: 'https://files.local/practitioner-abdelfattah-avatar.jpg',
        coverImageUrl: 'https://files.local/practitioner-abdelfattah-cover.jpg',
        isPublicProfilePublished: false,
        status: PractitionerStatus.PENDING_REVIEW,
        isOnlineToggleEnabled: false,
        isInstantBookingEnabled: false,
        acceptsPackages: true,
      },
      {
        userId: seedIds.users.practitionerE,
        profileId: seedIds.practitionerProfiles.practitionerE,
        countryId: seedIds.countries.egypt,
        primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
        practitionerType: PractitionerType.PSYCHOLOGIST,
        practitionerGender: PractitionerGender.MALE,
        publicSlug: 'dr-youssef-abdallah',
        professionalTitle: 'Anxiety and stress therapist',
        bio: 'Therapist helping patients manage anxiety, stress, and daily emotional overload.',
        yearsOfExperience: 10,
        sessionPrice30: '350',
        sessionPrice60: '650',
        sessionPrice30Egp: '350',
        sessionPrice30Usd: '21',
        sessionPrice60Egp: '650',
        sessionPrice60Usd: '38',
        instantBookingPrice30Egp: '440',
        instantBookingPrice30Usd: '27',
        instantBookingPrice60Egp: '800',
        instantBookingPrice60Usd: '48',
        avatarUrl: 'https://files.local/practitioner-youssef-avatar.jpg',
        coverImageUrl: 'https://files.local/practitioner-youssef-cover.jpg',
        isPublicProfilePublished: true,
        status: PractitionerStatus.APPROVED,
        isOnlineToggleEnabled: true,
        isInstantBookingEnabled: true,
        acceptsPackages: true,
      },
      {
        userId: seedIds.users.practitionerF,
        profileId: seedIds.practitionerProfiles.practitionerF,
        countryId: seedIds.countries.saudiArabia,
        primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
        practitionerType: PractitionerType.PSYCHOLOGIST,
        practitionerGender: PractitionerGender.MALE,
        publicSlug: 'dr-karim-hassan',
        professionalTitle: 'Depression therapist',
        bio: 'Therapist focused on recovery planning, prevention, and relapse-aware care.',
        yearsOfExperience: 11,
        sessionPrice30: '390',
        sessionPrice60: '720',
        sessionPrice30Egp: '390',
        sessionPrice30Usd: '24',
        sessionPrice60Egp: '720',
        sessionPrice60Usd: '43',
        instantBookingPrice30Egp: '480',
        instantBookingPrice30Usd: '29',
        instantBookingPrice60Egp: '880',
        instantBookingPrice60Usd: '53',
        avatarUrl: 'https://files.local/practitioner-karim-avatar.jpg',
        coverImageUrl: 'https://files.local/practitioner-karim-cover.jpg',
        isPublicProfilePublished: true,
        status: PractitionerStatus.APPROVED,
        isOnlineToggleEnabled: true,
        isInstantBookingEnabled: false,
        acceptsPackages: true,
      },
      {
        userId: seedIds.users.practitionerG,
        profileId: seedIds.practitionerProfiles.practitionerG,
        countryId: seedIds.countries.uae,
        primarySpecialtyCategoryId: seedIds.specialtyCategories.fitness,
        practitionerType: PractitionerType.WEIGHT_LOSS_SPECIALIST,
        practitionerGender: PractitionerGender.FEMALE,
        publicSlug: 'dr-sara-khaled',
        professionalTitle: 'Sports recovery specialist',
        bio: 'Specialist in performance recovery, healthy movement, and post-injury return-to-training.',
        yearsOfExperience: 9,
        sessionPrice30: '320',
        sessionPrice60: '580',
        sessionPrice30Egp: '320',
        sessionPrice30Usd: '19',
        sessionPrice60Egp: '580',
        sessionPrice60Usd: '34',
        instantBookingPrice30Egp: '410',
        instantBookingPrice30Usd: '25',
        instantBookingPrice60Egp: '740',
        instantBookingPrice60Usd: '45',
        avatarUrl: 'https://files.local/practitioner-sara-avatar.jpg',
        coverImageUrl: 'https://files.local/practitioner-sara-cover.jpg',
        isPublicProfilePublished: true,
        status: PractitionerStatus.APPROVED,
        isOnlineToggleEnabled: true,
        isInstantBookingEnabled: false,
        acceptsPackages: true,
      },
      {
        userId: seedIds.users.practitionerH,
        profileId: seedIds.practitionerProfiles.practitionerH,
        countryId: seedIds.countries.kuwait,
        primarySpecialtyCategoryId: seedIds.specialtyCategories.fitness,
        practitionerType: PractitionerType.WEIGHT_LOSS_SPECIALIST,
        practitionerGender: PractitionerGender.FEMALE,
        publicSlug: 'dr-nour-hani',
        professionalTitle: 'Performance coach',
        bio: 'Performance coach helping patients improve strength, endurance, and body composition.',
        yearsOfExperience: 12,
        sessionPrice30: '360',
        sessionPrice60: '680',
        sessionPrice30Egp: '360',
        sessionPrice30Usd: '22',
        sessionPrice60Egp: '680',
        sessionPrice60Usd: '40',
        instantBookingPrice30Egp: '450',
        instantBookingPrice30Usd: '28',
        instantBookingPrice60Egp: '830',
        instantBookingPrice60Usd: '50',
        avatarUrl: 'https://files.local/practitioner-nour-avatar.jpg',
        coverImageUrl: 'https://files.local/practitioner-nour-cover.jpg',
        isPublicProfilePublished: true,
        status: PractitionerStatus.APPROVED,
        isOnlineToggleEnabled: false,
        isInstantBookingEnabled: false,
        acceptsPackages: true,
      },
      {
        userId: seedIds.users.practitionerI,
        profileId: seedIds.practitionerProfiles.practitionerI,
        countryId: seedIds.countries.qatar,
        primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
        practitionerType: PractitionerType.PSYCHOLOGIST,
        practitionerGender: PractitionerGender.FEMALE,
        publicSlug: 'dr-mariam-ashraf',
        professionalTitle: 'Child and adolescent psychologist',
        bio: 'Psychologist specializing in child support, adolescence, and parent guidance.',
        yearsOfExperience: 13,
        sessionPrice30: '410',
        sessionPrice60: '760',
        sessionPrice30Egp: '410',
        sessionPrice30Usd: '25',
        sessionPrice60Egp: '760',
        sessionPrice60Usd: '45',
        instantBookingPrice30Egp: '500',
        instantBookingPrice30Usd: '30',
        instantBookingPrice60Egp: '920',
        instantBookingPrice60Usd: '55',
        avatarUrl: 'https://files.local/practitioner-mariam-avatar.jpg',
        coverImageUrl: 'https://files.local/practitioner-mariam-cover.jpg',
        isPublicProfilePublished: true,
        status: PractitionerStatus.APPROVED,
        isOnlineToggleEnabled: false,
        isInstantBookingEnabled: false,
        acceptsPackages: true,
      },
      {
        userId: seedIds.users.practitionerJ,
        profileId: seedIds.practitionerProfiles.practitionerJ,
        countryId: seedIds.countries.egypt,
        primarySpecialtyCategoryId: seedIds.specialtyCategories.mentalHealth,
        practitionerType: PractitionerType.PSYCHOLOGIST,
        practitionerGender: PractitionerGender.MALE,
        publicSlug: 'dr-hassan-tarek',
        professionalTitle: 'Integrated mental health therapist',
        bio: 'General mental health therapist supporting anxiety, depression, and lifestyle change.',
        yearsOfExperience: 15,
        sessionPrice30: '430',
        sessionPrice60: '790',
        sessionPrice30Egp: '430',
        sessionPrice30Usd: '26',
        sessionPrice60Egp: '790',
        sessionPrice60Usd: '47',
        instantBookingPrice30Egp: '540',
        instantBookingPrice30Usd: '33',
        instantBookingPrice60Egp: '980',
        instantBookingPrice60Usd: '58',
        avatarUrl: 'https://files.local/practitioner-hassan-avatar.jpg',
        coverImageUrl: 'https://files.local/practitioner-hassan-cover.jpg',
        isPublicProfilePublished: true,
        status: PractitionerStatus.APPROVED,
        isOnlineToggleEnabled: true,
        isInstantBookingEnabled: true,
        acceptsPackages: true,
      },
    ] as const;

    for (const profile of practitionerRows) {
      await prisma.practitionerProfile.upsert({
        where: { userId: profile.userId },
        create: {
          id: profile.profileId,
          userId: profile.userId,
          countryId: profile.countryId,
          primarySpecialtyCategoryId: profile.primarySpecialtyCategoryId,
          practitionerType: profile.practitionerType,
          practitionerGender: profile.practitionerGender,
          publicSlug: profile.publicSlug,
          professionalTitle: profile.professionalTitle,
          bio: profile.bio,
          yearsOfExperience: profile.yearsOfExperience,
          sessionPrice30: profile.sessionPrice30,
          sessionPrice60: profile.sessionPrice60,
          sessionPrice30Egp: profile.sessionPrice30Egp,
          sessionPrice30Usd: profile.sessionPrice30Usd,
          sessionPrice60Egp: profile.sessionPrice60Egp,
          sessionPrice60Usd: profile.sessionPrice60Usd,
          instantBookingPrice30Egp: profile.instantBookingPrice30Egp,
          instantBookingPrice30Usd: profile.instantBookingPrice30Usd,
          instantBookingPrice60Egp: profile.instantBookingPrice60Egp,
          instantBookingPrice60Usd: profile.instantBookingPrice60Usd,
          avatarUrl: profile.avatarUrl,
          coverImageUrl: profile.coverImageUrl,
          isPublicProfilePublished: profile.isPublicProfilePublished,
          status: profile.status,
          isOnlineToggleEnabled: profile.isOnlineToggleEnabled,
          isInstantBookingEnabled: profile.isInstantBookingEnabled,
          acceptsPackages: profile.acceptsPackages,
        },
        update: {
          countryId: profile.countryId,
          primarySpecialtyCategoryId: profile.primarySpecialtyCategoryId,
          practitionerType: profile.practitionerType,
          practitionerGender: profile.practitionerGender,
          publicSlug: profile.publicSlug,
          professionalTitle: profile.professionalTitle,
          bio: profile.bio,
          yearsOfExperience: profile.yearsOfExperience,
          sessionPrice30: profile.sessionPrice30,
          sessionPrice60: profile.sessionPrice60,
          sessionPrice30Egp: profile.sessionPrice30Egp,
          sessionPrice30Usd: profile.sessionPrice30Usd,
          sessionPrice60Egp: profile.sessionPrice60Egp,
          sessionPrice60Usd: profile.sessionPrice60Usd,
          instantBookingPrice30Egp: profile.instantBookingPrice30Egp,
          instantBookingPrice30Usd: profile.instantBookingPrice30Usd,
          instantBookingPrice60Egp: profile.instantBookingPrice60Egp,
          instantBookingPrice60Usd: profile.instantBookingPrice60Usd,
          avatarUrl: profile.avatarUrl,
          coverImageUrl: profile.coverImageUrl,
          isPublicProfilePublished: profile.isPublicProfilePublished,
          status: profile.status,
          isOnlineToggleEnabled: profile.isOnlineToggleEnabled,
          isInstantBookingEnabled: profile.isInstantBookingEnabled,
          acceptsPackages: profile.acceptsPackages,
        },
      });
    }

    await prisma.user.upsert({
      where: { id: patientCUserId },
      create: {
        id: patientCUserId,
        displayName: 'Omar Kareem',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Africa/Cairo',
      },
      update: {
        displayName: 'Omar Kareem',
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Africa/Cairo',
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_role: {
          userId: patientCUserId,
          role: UserRoleType.PATIENT,
        },
      },
      create: {
        userId: patientCUserId,
        role: UserRoleType.PATIENT,
      },
      update: {},
    });

    await prisma.userEmail.upsert({
      where: { email: seedCredentials.patientC.email },
      create: {
        userId: patientCUserId,
        email: seedCredentials.patientC.email,
        isPrimary: true,
        isVerified: true,
      },
      update: {
        userId: patientCUserId,
        isPrimary: true,
        isVerified: true,
      },
    });

    await prisma.userPhone.upsert({
      where: { phone: '+201000000099' },
      create: {
        userId: patientCUserId,
        phone: '+201000000099',
        isPrimary: true,
        isVerified: true,
      },
      update: {
        userId: patientCUserId,
        isPrimary: true,
        isVerified: true,
      },
    });

    const passwords = [
      { userId: patientCUserId, password: seedCredentials.patientC.password },
    ];

    for (const entry of passwords) {
      const passwordHash = await hashPassword(entry.password);
      const existing = await prisma.authIdentity.findFirst({
        where: {
          userId: entry.userId,
          provider: AuthProvider.PASSWORD,
        },
      });
      if (existing) {
        await prisma.authIdentity.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            isEnabled: true,
            lastUsedAt: null,
          },
        });
      } else {
        await prisma.authIdentity.create({
          data: {
            userId: entry.userId,
            provider: AuthProvider.PASSWORD,
            passwordHash,
            isEnabled: true,
          },
        });
      }
    }

    const patientProfiles = [
      {
        userId: patientAUserId,
        id: seedIds.patientProfiles.patientA,
        countryId: seedIds.countries.egypt,
        displayName: 'Ahmed Mahmoud',
        gender: 'MALE',
        dateOfBirth: new Date('1995-04-12'),
        onboardingCompletedAt: daysAgo(20),
      },
      {
        userId: patientBUserId,
        id: seedIds.patientProfiles.patientB,
        countryId: seedIds.countries.uae,
        displayName: 'Mohamed Abdelfattah',
        gender: 'MALE',
        dateOfBirth: new Date('1991-09-03'),
        onboardingCompletedAt: daysAgo(45),
      },
      {
        userId: patientCUserId,
        id: seedIds.patientProfiles.patientC,
        countryId: seedIds.countries.egypt,
        displayName: 'Omar Kareem',
        gender: 'MALE',
        dateOfBirth: new Date('1998-06-22'),
        onboardingCompletedAt: null,
      },
    ];

    for (const row of patientProfiles) {
      await prisma.patientProfile.upsert({
        where: { userId: row.userId },
        create: {
          id: row.id,
          userId: row.userId,
          countryId: row.countryId,
          displayName: row.displayName,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          onboardingCompletedAt: row.onboardingCompletedAt,
        },
        update: {
          countryId: row.countryId,
          displayName: row.displayName,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          onboardingCompletedAt: row.onboardingCompletedAt,
        },
      });
    }

    const patientARegion = practiceRegionCurrency('EG');
    const patientBRegion = practiceRegionCurrency('AE');

    const verifiedPractitionerId = seedIds.practitionerProfiles.practitionerB;
    const activePackagePractitionerId = seedIds.practitionerProfiles.practitionerB;
    const backupPackagePractitionerId = seedIds.practitionerProfiles.practitionerD;

    const packagePlan6 = await prisma.packagePlan.findUniqueOrThrow({
      where: { code: 'SESSIONS_6' },
    });
    const packagePlan4 = await prisma.packagePlan.findUniqueOrThrow({
      where: { code: 'SESSIONS_4' },
    });

    const now = new Date();
    const upcomingStart = addHours(now, 48);
    const activeStart = addMinutes(now, -20);
    const activeEnd = addMinutes(now, 40);
    const readyStart = addHours(now, 5);
    const completedStart = daysAgo(8);
    const cancelledStart = daysAgo(14);
    const packageStart = addHours(now, 72);
    const packageNextStart = addHours(now, 96);

    const sessions: CuratedSessionSeed[] = [
      {
        id: uuid('curated-session-eg-upcoming'),
        sessionCode: buildSessionCode('curated-session-eg-upcoming'),
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.UPCOMING,
        requestedStartAt: upcomingStart,
        scheduledStartAt: upcomingStart,
        scheduledEndAt: addMinutes(upcomingStart, 60),
        joinOpenAt: addMinutes(upcomingStart, -10),
        expiresAt: addHours(upcomingStart, -24),
        cancelledAt: null,
        provider: SessionProvider.DAILY,
        providerRoomId: 'qa-room-eg-upcoming',
        providerSessionRef: 'qa-provider-eg-upcoming',
        timezoneSnapshot: 'Africa/Cairo',
        packagePurchaseId: null,
        packageSessionIndex: null,
        packageSessionCount: null,
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
      },
      {
        id: uuid('curated-session-eg-active'),
        sessionCode: buildSessionCode('curated-session-eg-active'),
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.IN_PROGRESS,
        requestedStartAt: activeStart,
        scheduledStartAt: activeStart,
        scheduledEndAt: activeEnd,
        joinOpenAt: addMinutes(activeStart, -10),
        expiresAt: null,
        cancelledAt: null,
        provider: SessionProvider.DAILY,
        providerRoomId: 'qa-room-eg-active',
        providerSessionRef: 'qa-provider-eg-active',
        timezoneSnapshot: 'Africa/Cairo',
        packagePurchaseId: null,
        packageSessionIndex: null,
        packageSessionCount: null,
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
      },
      {
        id: uuid('curated-session-intl-ready'),
        sessionCode: buildSessionCode('curated-session-intl-ready'),
        patientId: seedIds.patientProfiles.patientB,
        practitionerId: seedIds.practitionerProfiles.practitionerF,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.READY_TO_JOIN,
        requestedStartAt: readyStart,
        scheduledStartAt: readyStart,
        scheduledEndAt: addMinutes(readyStart, 60),
        joinOpenAt: addMinutes(readyStart, -10),
        expiresAt: null,
        cancelledAt: null,
        provider: SessionProvider.ZOOM,
        providerRoomId: 'qa-room-intl-ready',
        providerSessionRef: 'qa-provider-intl-ready',
        timezoneSnapshot: 'Asia/Dubai',
        packagePurchaseId: null,
        packageSessionIndex: null,
        packageSessionCount: null,
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
      },
      {
        id: uuid('curated-session-intl-completed'),
        sessionCode: buildSessionCode('curated-session-intl-completed'),
        patientId: seedIds.patientProfiles.patientB,
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.COMPLETED,
        requestedStartAt: completedStart,
        scheduledStartAt: completedStart,
        scheduledEndAt: addMinutes(completedStart, 60),
        joinOpenAt: addMinutes(completedStart, -10),
        expiresAt: null,
        cancelledAt: null,
        completedAt: addMinutes(completedStart, 60),
        provider: SessionProvider.DAILY,
        providerRoomId: 'qa-room-intl-completed',
        providerSessionRef: 'qa-provider-intl-completed',
        timezoneSnapshot: 'Asia/Dubai',
        packagePurchaseId: null,
        packageSessionIndex: null,
        packageSessionCount: null,
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
      },
      {
        id: uuid('qa-manual-decision-eligible'),
        sessionCode: buildSessionCode('qa-manual-decision-eligible'),
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.COMPLETED,
        requestedStartAt: daysAgo(7),
        scheduledStartAt: daysAgo(7),
        scheduledEndAt: addMinutes(daysAgo(7), 60),
        joinOpenAt: addMinutes(daysAgo(7), -10),
        expiresAt: null,
        cancelledAt: null,
        completedAt: addMinutes(daysAgo(7), 60),
        provider: SessionProvider.DAILY,
        providerRoomId: 'qa-room-manual-decision-eligible',
        providerSessionRef: 'qa-provider-manual-decision-eligible',
        timezoneSnapshot: 'Africa/Cairo',
        packagePurchaseId: null,
        packageSessionIndex: null,
        packageSessionCount: null,
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
      },
      {
        id: uuid('curated-session-cancelled'),
        sessionCode: buildSessionCode('curated-session-cancelled'),
        patientId: seedIds.patientProfiles.patientB,
        practitionerId: seedIds.practitionerProfiles.practitionerD,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.CANCELLED,
        requestedStartAt: cancelledStart,
        scheduledStartAt: cancelledStart,
        scheduledEndAt: addMinutes(cancelledStart, 60),
        joinOpenAt: addMinutes(cancelledStart, -10),
        expiresAt: null,
        cancelledAt: addMinutes(cancelledStart, -60),
        provider: SessionProvider.NONE,
        providerRoomId: null,
        providerSessionRef: null,
        timezoneSnapshot: 'Asia/Dubai',
        packagePurchaseId: null,
        packageSessionIndex: null,
        packageSessionCount: null,
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
      },
      {
        id: uuid('curated-session-package-1'),
        sessionCode: buildSessionCode('curated-session-package-1'),
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.COMPLETED,
        requestedStartAt: daysAgo(6),
        scheduledStartAt: daysAgo(6),
        scheduledEndAt: addMinutes(daysAgo(6), 60),
        joinOpenAt: addMinutes(daysAgo(6), -10),
        expiresAt: null,
        cancelledAt: null,
        completedAt: addMinutes(daysAgo(6), 60),
        provider: SessionProvider.DAILY,
        providerRoomId: 'qa-room-package-1',
        providerSessionRef: 'qa-provider-package-1',
        timezoneSnapshot: 'Africa/Cairo',
        packagePurchaseId: uuid('curated-purchase-active'),
        packageSessionIndex: 1,
        packageSessionCount: 4,
        paymentCoverageType: SessionPaymentCoverageType.PACKAGE,
      },
      {
        id: uuid('curated-session-package-2'),
        sessionCode: buildSessionCode('curated-session-package-2'),
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.UPCOMING,
        requestedStartAt: packageStart,
        scheduledStartAt: packageStart,
        scheduledEndAt: addMinutes(packageStart, 60),
        joinOpenAt: addMinutes(packageStart, -10),
        expiresAt: null,
        cancelledAt: null,
        provider: SessionProvider.DAILY,
        providerRoomId: 'qa-room-package-2',
        providerSessionRef: 'qa-provider-package-2',
        timezoneSnapshot: 'Africa/Cairo',
        packagePurchaseId: uuid('curated-purchase-active'),
        packageSessionIndex: 2,
        packageSessionCount: 4,
        paymentCoverageType: SessionPaymentCoverageType.PACKAGE,
      },
      {
        id: uuid('curated-session-pending-payment'),
        sessionCode: buildSessionCode('curated-session-pending-payment'),
        patientId: seedIds.patientProfiles.patientB,
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.PENDING_PAYMENT,
        requestedStartAt: daysFromNow(3),
        scheduledStartAt: null,
        scheduledEndAt: null,
        joinOpenAt: null,
        expiresAt: daysFromNow(2),
        cancelledAt: null,
        provider: SessionProvider.NONE,
        providerRoomId: null,
        providerSessionRef: null,
        timezoneSnapshot: 'Asia/Dubai',
        packagePurchaseId: null,
        packageSessionIndex: null,
        packageSessionCount: null,
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
      },
      {
        id: uuid('curated-session-refunded'),
        sessionCode: buildSessionCode('curated-session-refunded'),
        patientId: seedIds.patientProfiles.patientB,
        practitionerId: seedIds.practitionerProfiles.practitionerF,
        flowType: SessionFlowType.SCHEDULED,
        sessionMode: SessionMode.VIDEO,
        durationMinutes: 60,
        status: SessionStatus.REFUNDED,
        requestedStartAt: daysAgo(18),
        scheduledStartAt: daysAgo(18),
        scheduledEndAt: addMinutes(daysAgo(18), 60),
        joinOpenAt: addMinutes(daysAgo(18), -10),
        expiresAt: null,
        cancelledAt: null,
        completedAt: null,
        provider: SessionProvider.ZOOM,
        providerRoomId: 'qa-room-refunded',
        providerSessionRef: 'qa-provider-refunded',
        timezoneSnapshot: 'Asia/Dubai',
        packagePurchaseId: null,
        packageSessionIndex: null,
        packageSessionCount: null,
        paymentCoverageType: SessionPaymentCoverageType.DIRECT_PAYMENT,
      },
    ] as const;

    for (const session of sessions) {
      const resolvedPackagePurchaseId = session.packagePurchaseId
        ? (
            await prisma.patientPackagePurchase.findUnique({
              where: { id: session.packagePurchaseId },
              select: { id: true },
            })
          )?.id ?? null
        : null;

      await prisma.session.upsert({
        where: { id: session.id },
        create: {
          ...session,
          packagePurchaseId: resolvedPackagePurchaseId,
        },
        update: {
          sessionCode: session.sessionCode,
          patientId: session.patientId,
          practitionerId: session.practitionerId,
          flowType: session.flowType,
          sessionMode: session.sessionMode,
          durationMinutes: session.durationMinutes,
          status: session.status,
          requestedStartAt: session.requestedStartAt,
          scheduledStartAt: session.scheduledStartAt,
          scheduledEndAt: session.scheduledEndAt,
          joinOpenAt: session.joinOpenAt,
          expiresAt: session.expiresAt,
          cancelledAt: session.cancelledAt,
          completedAt: session.completedAt ?? null,
          provider: session.provider,
          providerRoomId: session.providerRoomId,
          providerSessionRef: session.providerSessionRef,
          timezoneSnapshot: session.timezoneSnapshot,
          packagePurchaseId: resolvedPackagePurchaseId,
          packageSessionIndex: session.packageSessionIndex,
          packageSessionCount: session.packageSessionCount,
          paymentCoverageType: session.paymentCoverageType,
        },
      });
    }

    const payments: CuratedPaymentSeed[] = [
      {
        id: uuid('curated-payment-eg-upcoming'),
        sessionId: uuid('curated-session-eg-upcoming'),
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: patientARegion.provider,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: money(650),
        amountDiscount: money(0),
        amountTotal: money(650),
        amountFromWallet: money(0),
        amountFromGateway: money(650),
        currencyCode: patientARegion.currencyCode,
        providerPaymentRef: 'pay-curated-eg-upcoming',
        providerOrderRef: 'order-curated-eg-upcoming',
        providerCustomerRef: 'customer-curated-eg',
        initiatedAt: daysAgo(2),
        authorizedAt: daysAgo(2),
        capturedAt: daysAgo(2),
      },
      {
        id: uuid('curated-payment-eg-active'),
        sessionId: uuid('curated-session-eg-active'),
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: patientARegion.provider,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: money(600),
        amountDiscount: money(0),
        amountTotal: money(600),
        amountFromWallet: money(150),
        amountFromGateway: money(450),
        currencyCode: patientARegion.currencyCode,
        providerPaymentRef: 'pay-curated-eg-active',
        providerOrderRef: 'order-curated-eg-active',
        providerCustomerRef: 'customer-curated-eg',
        initiatedAt: daysAgo(1),
        authorizedAt: daysAgo(1),
        capturedAt: daysAgo(1),
      },
      {
        id: uuid('curated-payment-intl-ready'),
        sessionId: uuid('curated-session-intl-ready'),
        patientId: seedIds.patientProfiles.patientB,
        practitionerId: seedIds.practitionerProfiles.practitionerF,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: patientBRegion.provider,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: money(85),
        amountDiscount: money(0),
        amountTotal: money(85),
        amountFromWallet: money(0),
        amountFromGateway: money(85),
        currencyCode: patientBRegion.currencyCode,
        providerPaymentRef: 'pay-curated-intl-ready',
        providerOrderRef: 'order-curated-intl-ready',
        providerCustomerRef: 'customer-curated-intl',
        initiatedAt: daysAgo(3),
        authorizedAt: daysAgo(3),
        capturedAt: daysAgo(3),
      },
      {
        id: uuid('curated-payment-intl-completed'),
        sessionId: uuid('curated-session-intl-completed'),
        patientId: seedIds.patientProfiles.patientB,
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: patientBRegion.provider,
        status: PaymentStatus.REFUNDED,
        amountSubtotal: money(100),
        amountDiscount: money(0),
        amountTotal: money(100),
        amountFromWallet: money(0),
        amountFromGateway: money(100),
        currencyCode: patientBRegion.currencyCode,
        providerPaymentRef: 'pay-curated-intl-completed',
        providerOrderRef: 'order-curated-intl-completed',
        providerCustomerRef: 'customer-curated-intl',
        initiatedAt: daysAgo(18),
        authorizedAt: daysAgo(18),
        capturedAt: daysAgo(18),
      },
      {
        id: uuid('curated-payment-cancelled'),
        sessionId: uuid('curated-session-cancelled'),
        patientId: seedIds.patientProfiles.patientB,
        practitionerId: seedIds.practitionerProfiles.practitionerD,
        paymentPurpose: PaymentPurpose.SESSION_BOOKING,
        provider: patientBRegion.provider,
        status: PaymentStatus.FAILED,
        amountSubtotal: money(120),
        amountDiscount: money(0),
        amountTotal: money(120),
        amountFromWallet: money(0),
        amountFromGateway: money(120),
        currencyCode: patientBRegion.currencyCode,
        providerPaymentRef: 'pay-curated-cancelled',
        providerOrderRef: 'order-curated-cancelled',
        providerCustomerRef: 'customer-curated-intl',
        initiatedAt: daysAgo(14),
        failedAt: daysAgo(14),
      },
      {
        id: uuid('curated-payment-package'),
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: activePackagePractitionerId,
        paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
        provider: patientARegion.provider,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: money(1400),
        amountDiscount: money(140),
        amountTotal: money(1260),
        amountFromWallet: money(0),
        amountFromGateway: money(1260),
        currencyCode: patientARegion.currencyCode,
        providerPaymentRef: 'pay-curated-package',
        providerOrderRef: 'order-curated-package',
        providerCustomerRef: 'customer-curated-eg',
        initiatedAt: daysAgo(4),
        authorizedAt: daysAgo(4),
        capturedAt: daysAgo(4),
      },
      {
        id: uuid('curated-payment-academy-eg'),
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: activePackagePractitionerId,
        paymentPurpose: PaymentPurpose.COURSE_ENROLLMENT,
        provider: patientARegion.provider,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: money(750),
        amountDiscount: money(0),
        amountTotal: money(750),
        amountFromWallet: money(0),
        amountFromGateway: money(750),
        currencyCode: patientARegion.currencyCode,
        providerPaymentRef: 'pay-curated-academy-eg',
        providerOrderRef: 'order-curated-academy-eg',
        providerCustomerRef: 'customer-curated-eg',
        initiatedAt: daysAgo(5),
        authorizedAt: daysAgo(5),
        capturedAt: daysAgo(5),
      },
      {
        id: uuid('curated-payment-academy-intl'),
        patientId: seedIds.patientProfiles.patientB,
        practitionerId: activePackagePractitionerId,
        paymentPurpose: PaymentPurpose.COURSE_ENROLLMENT,
        provider: patientBRegion.provider,
        status: PaymentStatus.FAILED,
        amountSubtotal: money(24),
        amountDiscount: money(0),
        amountTotal: money(24),
        amountFromWallet: money(0),
        amountFromGateway: money(24),
        currencyCode: patientBRegion.currencyCode,
        providerPaymentRef: 'pay-curated-academy-intl',
        providerOrderRef: 'order-curated-academy-intl',
        providerCustomerRef: 'customer-curated-intl',
        initiatedAt: daysAgo(6),
        failedAt: daysAgo(6),
      },
    ] as const;

    for (const payment of payments) {
      await prisma.payment.upsert({
        where: { id: payment.id },
        create: payment,
        update: {
          sessionId: payment.sessionId ?? null,
          patientId: payment.patientId,
          practitionerId: payment.practitionerId,
          paymentPurpose: payment.paymentPurpose,
          provider: payment.provider,
          status: payment.status,
          amountSubtotal: payment.amountSubtotal,
          amountDiscount: payment.amountDiscount,
          amountTotal: payment.amountTotal,
          amountFromWallet: payment.amountFromWallet,
          amountFromGateway: payment.amountFromGateway,
          currencyCode: payment.currencyCode,
          providerPaymentRef: payment.providerPaymentRef,
          providerOrderRef: payment.providerOrderRef,
          providerCustomerRef: payment.providerCustomerRef,
          initiatedAt: payment.initiatedAt,
          authorizedAt: payment.authorizedAt ?? null,
          capturedAt: payment.capturedAt ?? null,
          failedAt: payment.failedAt ?? null,
        },
      });
    }

    const refunds = [
      {
        id: uuid('curated-refund-intl-completed'),
        paymentId: uuid('curated-payment-intl-completed'),
        sessionId: uuid('curated-session-intl-completed'),
        refundType: RefundType.FULL,
        status: RefundStatus.SUCCEEDED,
        destination: RefundDestination.ORIGINAL_METHOD,
        refundReason: 'Patient requested refund within policy window.',
        amount: money(100),
        currencyCode: patientBRegion.currencyCode,
        providerRefundRef: 'refund-curated-intl-completed',
        requestedAt: daysAgo(17),
        processedAt: daysAgo(17),
        failedAt: null,
      },
      {
        id: uuid('curated-refund-cancelled'),
        paymentId: uuid('curated-payment-cancelled'),
        sessionId: uuid('curated-session-cancelled'),
        refundType: RefundType.PARTIAL,
        status: RefundStatus.PROCESSING,
        destination: RefundDestination.CUSTOMER_WALLET,
        refundReason: 'Cancelled booking credited back to wallet for QA.',
        amount: money(60),
        currencyCode: patientBRegion.currencyCode,
        providerRefundRef: 'refund-curated-cancelled',
        requestedAt: daysAgo(13),
        processedAt: null,
        failedAt: null,
      },
    ] as const;

    for (const refund of refunds) {
      await prisma.refund.upsert({
        where: { id: refund.id },
        create: refund,
        update: {
          paymentId: refund.paymentId,
          sessionId: refund.sessionId,
          refundType: refund.refundType,
          status: refund.status,
          destination: refund.destination,
          refundReason: refund.refundReason,
          amount: refund.amount,
          currencyCode: refund.currencyCode,
          providerRefundRef: refund.providerRefundRef,
          requestedAt: refund.requestedAt,
          processedAt: refund.processedAt,
          failedAt: refund.failedAt,
        },
      });
    }

    const wallets = [
      {
        patientId: seedIds.patientProfiles.patientA,
        currencyCode: 'EGP',
        availableBalance: '150.00',
        reservedBalance: '100.00',
        lifetimeCredited: '250.00',
        lifetimeDebited: '100.00',
        lastEntryAt: daysAgo(1),
      },
      {
        patientId: seedIds.patientProfiles.patientB,
        currencyCode: 'USD',
        availableBalance: '35.00',
        reservedBalance: '0.00',
        lifetimeCredited: '100.00',
        lifetimeDebited: '65.00',
        lastEntryAt: daysAgo(3),
      },
    ] as const;

    for (const wallet of wallets) {
      await prisma.customerWallet.upsert({
        where: {
          patientId_currencyCode: {
            patientId: wallet.patientId,
            currencyCode: wallet.currencyCode,
          },
        },
        create: wallet,
        update: {
          availableBalance: wallet.availableBalance,
          reservedBalance: wallet.reservedBalance,
          lifetimeCredited: wallet.lifetimeCredited,
          lifetimeDebited: wallet.lifetimeDebited,
          lastEntryAt: wallet.lastEntryAt,
        },
      });
    }

    const patientAWallet = await prisma.customerWallet.findUniqueOrThrow({
      where: {
        patientId_currencyCode: {
          patientId: seedIds.patientProfiles.patientA,
          currencyCode: 'EGP',
        },
      },
    });
    const patientBWallet = await prisma.customerWallet.findUniqueOrThrow({
      where: {
        patientId_currencyCode: {
          patientId: seedIds.patientProfiles.patientB,
          currencyCode: 'USD',
        },
      },
    });

    const walletEntries = [
      {
        id: uuid('curated-wallet-entry-refund-credit'),
        walletId: patientAWallet.id,
        patientId: seedIds.patientProfiles.patientA,
        paymentId: uuid('curated-payment-eg-active'),
        refundId: uuid('curated-refund-cancelled'),
        sessionId: null,
        entryType: CustomerWalletEntryType.REFUND_CREDIT,
        direction: CustomerWalletEntryDirection.CREDIT,
        amount: money(150),
        currencyCode: 'EGP',
        description: 'QA refund credit for patient wallet.',
        referenceType: 'refund',
        referenceId: uuid('curated-refund-cancelled'),
        metadataJson: { scenario: 'curated-seed' },
        effectiveAt: daysAgo(1),
      },
      {
        id: uuid('curated-wallet-entry-reserve'),
        walletId: patientAWallet.id,
        patientId: seedIds.patientProfiles.patientA,
        paymentId: uuid('curated-payment-eg-active'),
        refundId: null,
        sessionId: uuid('curated-session-eg-active'),
        entryType: CustomerWalletEntryType.SESSION_PAYMENT_RESERVE,
        direction: CustomerWalletEntryDirection.DEBIT,
        amount: money(100),
        currencyCode: 'EGP',
        description: 'Reserved for a direct session checkout.',
        referenceType: 'payment',
        referenceId: uuid('curated-payment-eg-active'),
        metadataJson: { scenario: 'curated-seed' },
        effectiveAt: daysAgo(1),
      },
    ] as const;

    for (const entry of walletEntries) {
      await prisma.customerWalletEntry.upsert({
        where: { id: entry.id },
        create: entry,
        update: {
          walletId: entry.walletId,
          patientId: entry.patientId,
          paymentId: entry.paymentId,
          refundId: entry.refundId,
          sessionId: entry.sessionId,
          entryType: entry.entryType,
          direction: entry.direction,
          amount: entry.amount,
          currencyCode: entry.currencyCode,
          description: entry.description,
          referenceType: entry.referenceType,
          referenceId: entry.referenceId,
          metadataJson: entry.metadataJson,
          effectiveAt: entry.effectiveAt,
        },
      });
    }

    const walletReservationId = uuid('curated-wallet-reservation');
    await prisma.customerWalletReservation.upsert({
      where: { paymentId: uuid('curated-payment-eg-active') },
      create: {
        id: walletReservationId,
        walletId: patientAWallet.id,
        patientId: seedIds.patientProfiles.patientA,
        paymentId: uuid('curated-payment-eg-active'),
        status: CustomerWalletReservationStatus.CAPTURED,
        amount: money(100),
        currencyCode: 'EGP',
        expiresAt: daysAgo(1),
        capturedAt: daysAgo(1),
        releasedAt: null,
      },
      update: {
        walletId: patientAWallet.id,
        patientId: seedIds.patientProfiles.patientA,
        status: 'CAPTURED',
        amount: money(100),
        currencyCode: 'EGP',
        expiresAt: daysAgo(1),
        capturedAt: daysAgo(1),
        releasedAt: null,
      },
    });

    const ticketConversationId = uuid('curated-conversation-support');
    const careConversationId = uuid('curated-conversation-care');
    const intlConversationId = uuid('curated-conversation-intl');

    const conversations = [
      {
        id: ticketConversationId,
        conversationType: ConversationType.SUPPORT,
        status: ConversationStatus.OPEN,
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: null,
        supportTicketId: uuid('curated-ticket-payment'),
        sessionId: null,
        chatApprovalRequestId: null,
        conversationRef: 'SUP-QA-001',
        startedAt: daysAgo(3),
        closedAt: null,
        expiresAt: null,
      },
      {
        id: careConversationId,
        conversationType: ConversationType.CARE_APPROVED,
        status: ConversationStatus.OPEN,
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        supportTicketId: null,
        sessionId: uuid('curated-session-eg-upcoming'),
        chatApprovalRequestId: null,
        conversationRef: 'CARE-QA-001',
        startedAt: daysAgo(2),
        closedAt: null,
        expiresAt: null,
      },
      {
        id: intlConversationId,
        conversationType: ConversationType.CARE_APPROVED,
        status: ConversationStatus.OPEN,
        patientId: seedIds.patientProfiles.patientB,
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        supportTicketId: null,
        sessionId: uuid('curated-session-intl-ready'),
        chatApprovalRequestId: null,
        conversationRef: 'CARE-QA-002',
        startedAt: daysAgo(1),
        closedAt: null,
        expiresAt: null,
      },
    ] as const;

    for (const conversation of conversations) {
      await prisma.conversation.upsert({
        where: { id: conversation.id },
        create: conversation,
        update: {
          conversationType: conversation.conversationType,
          status: conversation.status,
          patientId: conversation.patientId,
          practitionerId: conversation.practitionerId,
          supportTicketId: conversation.supportTicketId,
          sessionId: conversation.sessionId,
          chatApprovalRequestId: conversation.chatApprovalRequestId,
          conversationRef: conversation.conversationRef,
          startedAt: conversation.startedAt,
          closedAt: conversation.closedAt,
          expiresAt: conversation.expiresAt,
        },
      });
    }

    const supportTicketId = uuid('curated-ticket-payment');
    await prisma.supportTicket.upsert({
      where: { conversationId: ticketConversationId },
      create: {
        id: supportTicketId,
        openedByUserId: patientAUserId,
        createdByRole: ConversationParticipantRole.PATIENT,
        patientId: seedIds.patientProfiles.patientA,
        practitionerId: null,
        conversationId: ticketConversationId,
        ticketType: SupportTicketType.PAYMENT,
        status: SupportTicketStatus.OPEN,
        priority: SupportTicketPriority.HIGH,
        subject: 'Payment summary looks different on web and mobile',
        description: 'The patient wants confirmation that the booking amount and currency match the resolved regional pricing.',
        assignedToUserId: supportUserId,
        publicTicketRef: 'TCK-QA-001',
        relatedSessionId: uuid('curated-session-eg-upcoming'),
        relatedPaymentId: uuid('curated-payment-eg-upcoming'),
        relatedInstantBookingRequestId: null,
        relatedMatchingSessionId: null,
        relatedAssessmentSubmissionId: null,
        lastMessageAt: daysAgo(1),
      },
      update: {
        openedByUserId: patientAUserId,
        createdByRole: ConversationParticipantRole.PATIENT,
        patientId: seedIds.patientProfiles.patientA,
        conversationId: ticketConversationId,
        ticketType: SupportTicketType.PAYMENT,
        status: SupportTicketStatus.OPEN,
        priority: SupportTicketPriority.HIGH,
        subject: 'Payment summary looks different on web and mobile',
        description: 'The patient wants confirmation that the booking amount and currency match the resolved regional pricing.',
        assignedToUserId: supportUserId,
        publicTicketRef: 'TCK-QA-001',
        relatedSessionId: uuid('curated-session-eg-upcoming'),
        relatedPaymentId: uuid('curated-payment-eg-upcoming'),
        lastMessageAt: daysAgo(1),
      },
    });

    const conversationParticipants = [
      {
        id: uuid('curated-conversation-participant-support-patient'),
        conversationId: ticketConversationId,
        userId: patientAUserId,
        participantRole: ConversationParticipantRole.PATIENT,
        joinedAt: daysAgo(3),
        lastReadMessageId: uuid('curated-message-support-1'),
        lastReadAt: daysAgo(2),
        isMuted: false,
        isActive: true,
      },
      {
        id: uuid('curated-conversation-participant-support-agent'),
        conversationId: ticketConversationId,
        userId: supportUserId,
        participantRole: ConversationParticipantRole.SUPPORT_AGENT,
        joinedAt: daysAgo(3),
        lastReadMessageId: uuid('curated-message-support-2'),
        lastReadAt: daysAgo(1),
        isMuted: false,
        isActive: true,
      },
      {
        id: uuid('curated-conversation-participant-care-patient'),
        conversationId: careConversationId,
        userId: patientAUserId,
        participantRole: ConversationParticipantRole.PATIENT,
        joinedAt: daysAgo(2),
        lastReadMessageId: uuid('curated-message-care-2'),
        lastReadAt: daysAgo(1),
        isMuted: false,
        isActive: true,
      },
      {
        id: uuid('curated-conversation-participant-care-practitioner'),
        conversationId: careConversationId,
        userId: seedIds.users.practitionerB,
        participantRole: ConversationParticipantRole.PRACTITIONER,
        joinedAt: daysAgo(2),
        lastReadMessageId: uuid('curated-message-care-3'),
        lastReadAt: daysAgo(1),
        isMuted: false,
        isActive: true,
      },
      {
        id: uuid('curated-conversation-participant-intl-patient'),
        conversationId: intlConversationId,
        userId: patientBUserId,
        participantRole: ConversationParticipantRole.PATIENT,
        joinedAt: daysAgo(1),
        lastReadMessageId: uuid('curated-message-intl-1'),
        lastReadAt: daysAgo(1),
        isMuted: false,
        isActive: true,
      },
      {
        id: uuid('curated-conversation-participant-intl-practitioner'),
        conversationId: intlConversationId,
        userId: seedIds.users.practitionerE,
        participantRole: ConversationParticipantRole.PRACTITIONER,
        joinedAt: daysAgo(1),
        lastReadMessageId: null,
        lastReadAt: null,
        isMuted: false,
        isActive: true,
      },
    ] as const;

    for (const participant of conversationParticipants) {
      await prisma.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: participant.conversationId,
            userId: participant.userId,
          },
        },
        create: participant,
        update: {
          participantRole: participant.participantRole,
          joinedAt: participant.joinedAt,
          lastReadMessageId: participant.lastReadMessageId,
          lastReadAt: participant.lastReadAt,
          isMuted: participant.isMuted,
          isActive: participant.isActive,
        },
      });
    }

    const messages = [
      {
        id: uuid('curated-message-support-1'),
        conversationId: ticketConversationId,
        senderUserId: patientAUserId,
        messageType: MessageType.TEXT,
        status: MessageStatus.READ,
        visibility: MessageVisibility.NORMAL,
        contentText:
          'My payment summary looks different between web and mobile. Can someone check the final amount and currency?',
        replyToMessageId: null,
        sentAt: daysAgo(3),
        deliveredAt: daysAgo(3),
        readAt: daysAgo(2),
      },
      {
        id: uuid('curated-message-support-2'),
        conversationId: ticketConversationId,
        senderUserId: supportUserId,
        messageType: MessageType.TEXT,
        status: MessageStatus.READ,
        visibility: MessageVisibility.NORMAL,
        contentText:
          'We checked the booking flow and the resolved regional pricing is now centralized. Please refresh the payment screen.',
        replyToMessageId: uuid('curated-message-support-1'),
        sentAt: daysAgo(2),
        deliveredAt: daysAgo(2),
        readAt: daysAgo(2),
      },
      {
        id: uuid('curated-message-support-3'),
        conversationId: ticketConversationId,
        senderUserId: supportUserId,
        messageType: MessageType.TEXT,
        status: MessageStatus.SENT,
        visibility: MessageVisibility.NORMAL,
        contentText:
          'If the summary still looks stale, a full refresh should resolve the cached breakdown.',
        replyToMessageId: null,
        sentAt: daysAgo(1),
        deliveredAt: daysAgo(1),
        readAt: null,
      },
      {
        id: uuid('curated-message-care-1'),
        conversationId: careConversationId,
        senderUserId: seedIds.users.practitionerB,
        messageType: MessageType.TEXT,
        status: MessageStatus.READ,
        visibility: MessageVisibility.NORMAL,
        contentText: 'Your session is confirmed for tomorrow morning.',
        replyToMessageId: null,
        sentAt: daysAgo(2),
        deliveredAt: daysAgo(2),
        readAt: daysAgo(2),
      },
      {
        id: uuid('curated-message-care-2'),
        conversationId: careConversationId,
        senderUserId: patientAUserId,
        messageType: MessageType.TEXT,
        status: MessageStatus.READ,
        visibility: MessageVisibility.NORMAL,
        contentText: 'Thank you. I can join from the mobile app.',
        replyToMessageId: uuid('curated-message-care-1'),
        sentAt: daysAgo(2),
        deliveredAt: daysAgo(2),
        readAt: daysAgo(1),
      },
      {
        id: uuid('curated-message-care-3'),
        conversationId: careConversationId,
        senderUserId: seedIds.users.practitionerB,
        messageType: MessageType.TEXT,
        status: MessageStatus.SENT,
        visibility: MessageVisibility.NORMAL,
        contentText: 'Please keep an eye on the session reminder and arrival instructions.',
        replyToMessageId: null,
        sentAt: daysAgo(1),
        deliveredAt: daysAgo(1),
        readAt: null,
      },
      {
        id: uuid('curated-message-intl-1'),
        conversationId: intlConversationId,
        senderUserId: patientBUserId,
        messageType: MessageType.TEXT,
        status: MessageStatus.READ,
        visibility: MessageVisibility.NORMAL,
        contentText: 'I completed the payment from the web checkout.',
        replyToMessageId: null,
        sentAt: daysAgo(1),
        deliveredAt: daysAgo(1),
        readAt: daysAgo(1),
      },
      {
        id: uuid('curated-message-intl-2'),
        conversationId: intlConversationId,
        senderUserId: seedIds.users.practitionerE,
        messageType: MessageType.TEXT,
        status: MessageStatus.SENT,
        visibility: MessageVisibility.NORMAL,
        contentText: 'Great. I will see you at the scheduled time.',
        replyToMessageId: uuid('curated-message-intl-1'),
        sentAt: daysAgo(1),
        deliveredAt: daysAgo(1),
        readAt: null,
      },
    ] as const;

    for (const message of messages) {
      await prisma.message.upsert({
        where: { id: message.id },
        create: message,
        update: {
          conversationId: message.conversationId,
          senderUserId: message.senderUserId,
          messageType: message.messageType,
          status: message.status,
          visibility: message.visibility,
          contentText: message.contentText,
          replyToMessageId: message.replyToMessageId,
          sentAt: message.sentAt,
          deliveredAt: message.deliveredAt,
          readAt: message.readAt,
        },
      });
    }

    const notificationTypeSlugs = [
      'payments.payment-succeeded',
      'payments.payment-failed',
      'sessions.session-confirmed',
      'sessions.session-confirmed-practitioner',
      'sessions.session-join-available',
      'training.enrollment-confirmed',
    ] as const;

    const notificationTypeBySlug = new Map(
      (
        await prisma.notificationType.findMany({
          where: {
            slug: {
              in: [...notificationTypeSlugs],
            },
          },
        })
      ).map((type) => [type.slug, type.id] as const),
    );

    for (const slug of notificationTypeSlugs) {
      if (!notificationTypeBySlug.get(slug)) {
        throw new Error(
          `[seed:curated-dev] missing notification type slug: ${slug}. Ensure notifications.seed runs before curated-dev.`,
        );
      }
    }

    const notifications = [
      {
        id: uuid('curated-notification-payment-succeeded'),
        userId: patientAUserId,
        notificationTypeId: notificationTypeBySlug.get('payments.payment-succeeded')!,
        templateId: null,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.READ,
        locale: 'ar',
        payloadJson: { sessionCode: buildSessionCode('curated-session-eg-upcoming') },
        titleSnapshot: 'Payment completed',
        subjectSnapshot: null,
        bodySnapshot: 'Your booking payment has been completed successfully.',
        relatedEntityType: 'payment',
        relatedEntityId: uuid('curated-payment-eg-upcoming'),
        idempotencyKey: 'curated-notification-payment-succeeded',
        scheduledFor: null,
        sentAt: daysAgo(2),
        deliveredAt: daysAgo(2),
        readAt: daysAgo(1),
        failedAt: null,
        suppressedReason: null,
      },
      {
        id: uuid('curated-notification-session-join'),
        userId: patientAUserId,
        notificationTypeId: notificationTypeBySlug.get('sessions.session-join-available')!,
        templateId: null,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        locale: 'ar',
        payloadJson: { sessionCode: buildSessionCode('curated-session-eg-active') },
        titleSnapshot: 'Session ready to join',
        subjectSnapshot: null,
        bodySnapshot: 'Your session will start soon. Open the session page to join securely.',
        relatedEntityType: 'session',
        relatedEntityId: uuid('curated-session-eg-active'),
        idempotencyKey: 'curated-notification-session-join',
        scheduledFor: null,
        sentAt: daysAgo(1),
        deliveredAt: daysAgo(1),
        readAt: null,
        failedAt: null,
        suppressedReason: null,
      },
      {
        id: uuid('curated-notification-payment-failed'),
        userId: patientBUserId,
        notificationTypeId: notificationTypeBySlug.get('payments.payment-failed')!,
        templateId: null,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        locale: 'ar',
        payloadJson: { reason: 'Card declined' },
        titleSnapshot: 'Payment failed',
        subjectSnapshot: null,
        bodySnapshot: 'Your international checkout failed and needs another attempt.',
        relatedEntityType: 'payment',
        relatedEntityId: uuid('curated-payment-academy-intl'),
        idempotencyKey: 'curated-notification-payment-failed',
        scheduledFor: null,
        sentAt: daysAgo(6),
        deliveredAt: daysAgo(6),
        readAt: null,
        failedAt: null,
        suppressedReason: null,
      },
      {
        id: uuid('curated-notification-enrollment'),
        userId: patientCUserId,
        notificationTypeId: notificationTypeBySlug.get('training.enrollment-confirmed')!,
        templateId: null,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.READ,
        locale: 'ar',
        payloadJson: { courseSlug: 'anxiety-foundations-101' },
        titleSnapshot: 'Training enrollment confirmed',
        subjectSnapshot: null,
        bodySnapshot: 'Your academy enrollment has been confirmed.',
        relatedEntityType: 'academyEnrollment',
        relatedEntityId: uuid('curated-academy-enrollment-patient-c'),
        idempotencyKey: 'curated-notification-enrollment',
        scheduledFor: null,
        sentAt: daysAgo(1),
        deliveredAt: daysAgo(1),
        readAt: daysAgo(1),
        failedAt: null,
        suppressedReason: null,
      },
      {
        id: uuid('curated-notification-practitioner'),
        userId: seedIds.users.practitionerB,
        notificationTypeId: notificationTypeBySlug.get('sessions.session-confirmed-practitioner')!,
        templateId: null,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        locale: 'ar',
        payloadJson: { sessionCode: buildSessionCode('curated-session-eg-upcoming') },
        titleSnapshot: 'New confirmed session',
        subjectSnapshot: null,
        bodySnapshot: 'A session has been confirmed with your patient.',
        relatedEntityType: 'session',
        relatedEntityId: uuid('curated-session-eg-upcoming'),
        idempotencyKey: 'curated-notification-practitioner',
        scheduledFor: null,
        sentAt: daysAgo(2),
        deliveredAt: daysAgo(2),
        readAt: null,
        failedAt: null,
        suppressedReason: null,
      },
    ] as const;

    for (const notification of notifications) {
      await prisma.notification.upsert({
        where: { id: notification.id },
        create: notification,
        update: {
          userId: notification.userId,
          notificationTypeId: notification.notificationTypeId,
          templateId: notification.templateId,
          channel: notification.channel,
          status: notification.status,
          locale: notification.locale,
          payloadJson: notification.payloadJson,
          titleSnapshot: notification.titleSnapshot,
          subjectSnapshot: notification.subjectSnapshot,
          bodySnapshot: notification.bodySnapshot,
          relatedEntityType: notification.relatedEntityType,
          relatedEntityId: notification.relatedEntityId,
          idempotencyKey: notification.idempotencyKey,
          scheduledFor: notification.scheduledFor,
          sentAt: notification.sentAt,
          deliveredAt: notification.deliveredAt,
          readAt: notification.readAt,
          failedAt: notification.failedAt,
          suppressedReason: notification.suppressedReason,
        },
      });
    }

    const packagePurchaseActiveId = uuid('curated-purchase-active');
    const packagePurchaseRefundedId = uuid('curated-purchase-refunded');
    const packageSettlementHoldId = uuid('curated-package-settlement-hold');
    const packageSettlementRefundedId = uuid('curated-package-settlement-refunded');

    const packagePurchases = [
      {
        id: packagePurchaseActiveId,
        packagePlanId: packagePlan6.id,
        practitionerId: activePackagePractitionerId,
        patientId: seedIds.patientProfiles.patientA,
        paymentId: uuid('curated-payment-package'),
        status: PatientPackagePurchaseStatus.ACTIVE,
        paymentInitiatedAt: daysAgo(4),
        paymentExpiresAt: daysFromNow(1),
        paidAt: daysAgo(4),
        activatedAt: daysAgo(4),
        completedAt: null,
        expiredAt: null,
        cancelledAt: null,
        refundedAt: null,
        titleSnapshot: 'Mindset Starter',
        descriptionSnapshot:
          'Four focused sessions for a practical mental health reset.',
        slugSnapshot: 'mindset-starter',
        packageVersionSnapshot: 1,
        planIdSnapshot: packagePlan6.id,
        planCodeSnapshot: packagePlan6.code,
        sessionCountSnapshot: 4,
        discountPercentSnapshot: '15',
        baseSessionPriceEgpSnapshot: '350',
        baseSessionPriceUsdSnapshot: '21',
        currencyCodeSnapshot: 'EGP',
        selectedBaseSessionPriceSnapshot: '350',
        undiscountedTotalSnapshot: '1400',
        discountAmountSnapshot: '140',
        patientPayableTotalSnapshot: '1260',
        platformDiscountShareSnapshot: '70',
        practitionerDiscountShareSnapshot: '70',
        commissionModeSnapshot: 'STANDARD',
        platformOriginalShareSnapshot: '336',
        practitionerOriginalShareSnapshot: '924',
        platformFinalShareSnapshot: '294',
        practitionerFinalShareSnapshot: '966',
        sessionDurationMinutesSnapshot: 45,
        sessionModeSnapshot: SessionMode.VIDEO,
        schedulePolicySnapshot: PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
        priceEgpSnapshot: '1400',
        priceUsdSnapshot: '85',
        selectedCurrencyCode: 'EGP',
        selectedAmountSnapshot: '1260',
        metadataJson: { scenario: 'curated-seed' },
      },
      {
        id: packagePurchaseRefundedId,
        packagePlanId: packagePlan4.id,
        practitionerId: backupPackagePractitionerId,
        patientId: seedIds.patientProfiles.patientB,
        paymentId: null,
        status: PatientPackagePurchaseStatus.REFUNDED,
        paymentInitiatedAt: daysAgo(10),
        paymentExpiresAt: daysAgo(9),
        paidAt: daysAgo(10),
        activatedAt: daysAgo(10),
        completedAt: null,
        expiredAt: null,
        cancelledAt: null,
        refundedAt: daysAgo(3),
        titleSnapshot: 'Weight Reset',
        descriptionSnapshot:
          'Six-session package for structured nutrition and habit change.',
        slugSnapshot: 'weight-reset',
        packageVersionSnapshot: 1,
        planIdSnapshot: packagePlan4.id,
        planCodeSnapshot: packagePlan4.code,
        sessionCountSnapshot: 6,
        discountPercentSnapshot: '10',
        baseSessionPriceEgpSnapshot: '300',
        baseSessionPriceUsdSnapshot: '18',
        currencyCodeSnapshot: 'USD',
        selectedBaseSessionPriceSnapshot: '18',
        undiscountedTotalSnapshot: '108',
        discountAmountSnapshot: '10.80',
        patientPayableTotalSnapshot: '97.20',
        platformDiscountShareSnapshot: '5.40',
        practitionerDiscountShareSnapshot: '5.40',
        commissionModeSnapshot: 'STANDARD',
        platformOriginalShareSnapshot: '32.40',
        practitionerOriginalShareSnapshot: '64.80',
        platformFinalShareSnapshot: '29.16',
        practitionerFinalShareSnapshot: '68.04',
        sessionDurationMinutesSnapshot: 50,
        sessionModeSnapshot: SessionMode.VIDEO,
        schedulePolicySnapshot: PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE,
        priceEgpSnapshot: '1800',
        priceUsdSnapshot: '110',
        selectedCurrencyCode: 'USD',
        selectedAmountSnapshot: '97.20',
        metadataJson: { scenario: 'curated-seed', refunded: true },
      },
    ] as const;

    for (const purchase of packagePurchases) {
      await prisma.patientPackagePurchase.upsert({
        where: { id: purchase.id },
        create: purchase,
        update: {
          packagePlanId: purchase.packagePlanId,
          practitionerId: purchase.practitionerId,
          patientId: purchase.patientId,
          paymentId: purchase.paymentId,
          status: purchase.status,
          paymentInitiatedAt: purchase.paymentInitiatedAt,
          paymentExpiresAt: purchase.paymentExpiresAt,
          paidAt: purchase.paidAt,
          activatedAt: purchase.activatedAt,
          completedAt: purchase.completedAt,
          expiredAt: purchase.expiredAt,
          cancelledAt: purchase.cancelledAt,
          refundedAt: purchase.refundedAt,
          titleSnapshot: purchase.titleSnapshot,
          descriptionSnapshot: purchase.descriptionSnapshot,
          slugSnapshot: purchase.slugSnapshot,
          packageVersionSnapshot: purchase.packageVersionSnapshot,
          planIdSnapshot: purchase.planIdSnapshot,
          planCodeSnapshot: purchase.planCodeSnapshot,
          sessionCountSnapshot: purchase.sessionCountSnapshot,
          discountPercentSnapshot: purchase.discountPercentSnapshot,
          baseSessionPriceEgpSnapshot: purchase.baseSessionPriceEgpSnapshot,
          baseSessionPriceUsdSnapshot: purchase.baseSessionPriceUsdSnapshot,
          currencyCodeSnapshot: purchase.currencyCodeSnapshot,
          selectedBaseSessionPriceSnapshot:
            purchase.selectedBaseSessionPriceSnapshot,
          undiscountedTotalSnapshot: purchase.undiscountedTotalSnapshot,
          discountAmountSnapshot: purchase.discountAmountSnapshot,
          patientPayableTotalSnapshot: purchase.patientPayableTotalSnapshot,
          platformDiscountShareSnapshot: purchase.platformDiscountShareSnapshot,
          practitionerDiscountShareSnapshot:
            purchase.practitionerDiscountShareSnapshot,
          commissionModeSnapshot: purchase.commissionModeSnapshot,
          platformOriginalShareSnapshot: purchase.platformOriginalShareSnapshot,
          practitionerOriginalShareSnapshot:
            purchase.practitionerOriginalShareSnapshot,
          platformFinalShareSnapshot: purchase.platformFinalShareSnapshot,
          practitionerFinalShareSnapshot: purchase.practitionerFinalShareSnapshot,
          sessionDurationMinutesSnapshot:
            purchase.sessionDurationMinutesSnapshot,
          sessionModeSnapshot: purchase.sessionModeSnapshot,
          schedulePolicySnapshot: purchase.schedulePolicySnapshot,
          priceEgpSnapshot: purchase.priceEgpSnapshot,
          priceUsdSnapshot: purchase.priceUsdSnapshot,
          selectedCurrencyCode: purchase.selectedCurrencyCode,
          selectedAmountSnapshot: purchase.selectedAmountSnapshot,
          metadataJson: purchase.metadataJson,
        },
      });
    }

    await prisma.session.updateMany({
      where: {
        id: {
          in: [uuid('curated-session-package-1'), uuid('curated-session-package-2')],
        },
      },
      data: {
        packagePurchaseId: packagePurchaseActiveId,
      },
    });

    const packageSettlements = [
      {
        id: packageSettlementHoldId,
        purchaseId: packagePurchaseActiveId,
        practitionerId: activePackagePractitionerId,
        patientId: seedIds.patientProfiles.patientA,
        currencyCode: 'EGP',
        status: PackageSettlementStatus.HELD,
        sessionCount: 4,
        completedSessionsCount: 1,
        heldPractitionerAmount: '966.00',
        heldPlatformAmount: '294.00',
        releasablePractitionerAmount: '0.00',
        releasedPractitionerAmount: '0.00',
        normalEquivalentUsedAmount: '350.00',
        discountAppliedAmount: '140.00',
        reviewedAt: null,
        reviewedByAdminId: null,
        releasedAt: null,
        releasedByAdminId: null,
        decision: 'HELD_AWAITING_SESSION_COMPLETION',
        notes: 'Held for QA package lifecycle coverage.',
        metadataJson: { scenario: 'curated-seed' },
      },
      {
        id: packageSettlementRefundedId,
        purchaseId: packagePurchaseRefundedId,
        practitionerId: backupPackagePractitionerId,
        patientId: seedIds.patientProfiles.patientB,
        currencyCode: 'USD',
        status: PackageSettlementStatus.REFUNDED_OR_ADJUSTED,
        sessionCount: 6,
        completedSessionsCount: 0,
        heldPractitionerAmount: '68.04',
        heldPlatformAmount: '29.16',
        releasablePractitionerAmount: '0.00',
        releasedPractitionerAmount: '0.00',
        normalEquivalentUsedAmount: '18.00',
        discountAppliedAmount: '10.80',
        reviewedAt: daysAgo(3),
        reviewedByAdminId: adminUserId,
        releasedAt: null,
        releasedByAdminId: null,
        decision: 'REFUNDED',
        notes: 'Refunded package purchase kept for QA historical state.',
        metadataJson: { scenario: 'curated-seed' },
      },
    ] as const;

    for (const settlement of packageSettlements) {
      await prisma.packageSettlement.upsert({
        where: { id: settlement.id },
        create: settlement,
        update: {
          purchaseId: settlement.purchaseId,
          practitionerId: settlement.practitionerId,
          patientId: settlement.patientId,
          currencyCode: settlement.currencyCode,
          status: settlement.status,
          sessionCount: settlement.sessionCount,
          completedSessionsCount: settlement.completedSessionsCount,
          heldPractitionerAmount: settlement.heldPractitionerAmount,
          heldPlatformAmount: settlement.heldPlatformAmount,
          releasablePractitionerAmount: settlement.releasablePractitionerAmount,
          releasedPractitionerAmount: settlement.releasedPractitionerAmount,
          normalEquivalentUsedAmount: settlement.normalEquivalentUsedAmount,
          discountAppliedAmount: settlement.discountAppliedAmount,
          reviewedAt: settlement.reviewedAt,
          reviewedByAdminId: settlement.reviewedByAdminId,
          releasedAt: settlement.releasedAt,
          releasedByAdminId: settlement.releasedByAdminId,
          decision: settlement.decision,
          notes: settlement.notes,
          metadataJson: settlement.metadataJson,
        },
      });
    }

    const academyCourses = [
      {
        id: uuid('curated-academy-anxiety'),
        slug: 'anxiety-foundations-101',
        title: 'Anxiety Foundations',
        shortDescription: 'A calm, practical introduction to anxiety management.',
        fullDescription:
          'A small guided program that helps learners understand anxiety triggers, body cues, and realistic coping strategies.',
        status: CourseStatus.PUBLISHED,
        visibility: CourseVisibility.PUBLIC,
        coverImageUrl: 'https://files.local/academy-anxiety-cover.jpg',
        thumbnailUrl: 'https://files.local/academy-anxiety-thumb.jpg',
        priceAmountEgp: '750',
        priceAmountUsd: '24',
        priceAmount: '750',
        currencyCode: 'EGP',
        startsAt: daysFromNow(7),
        endsAt: daysFromNow(21),
        plannedDurationDays: 14,
        plannedLectureCount: 3,
        meetingUrl: 'https://meet.local/academy/anxiety-foundations',
        whatsappGroupUrl: 'https://wa.me/0000000000',
        publishedAt: daysAgo(10),
        archivedAt: null,
      },
      {
        id: uuid('curated-academy-sleep'),
        slug: 'sleep-habits-bootcamp',
        title: 'Sleep Habits Bootcamp',
        shortDescription: 'A short course for building a better sleep routine.',
        fullDescription:
          'A compact course focused on sleep hygiene, consistency, and an easier nightly routine.',
        status: CourseStatus.ARCHIVED,
        visibility: CourseVisibility.PUBLIC,
        coverImageUrl: 'https://files.local/academy-sleep-cover.jpg',
        thumbnailUrl: 'https://files.local/academy-sleep-thumb.jpg',
        priceAmountEgp: '550',
        priceAmountUsd: '18',
        priceAmount: '550',
        currencyCode: 'EGP',
        startsAt: daysAgo(20),
        endsAt: daysAgo(5),
        plannedDurationDays: 10,
        plannedLectureCount: 2,
        meetingUrl: 'https://meet.local/academy/sleep-bootcamp',
        whatsappGroupUrl: 'https://wa.me/0000000001',
        publishedAt: daysAgo(30),
        archivedAt: daysAgo(2),
      },
    ] as const;

    for (const course of academyCourses) {
      await prisma.academyCourse.upsert({
        where: { slug: course.slug },
        create: course,
        update: {
          title: course.title,
          shortDescription: course.shortDescription,
          fullDescription: course.fullDescription,
          status: course.status,
          visibility: course.visibility,
          coverImageUrl: course.coverImageUrl,
          thumbnailUrl: course.thumbnailUrl,
          priceAmountEgp: course.priceAmountEgp,
          priceAmountUsd: course.priceAmountUsd,
          priceAmount: course.priceAmount,
          currencyCode: course.currencyCode,
          startsAt: course.startsAt,
          endsAt: course.endsAt,
          plannedDurationDays: course.plannedDurationDays,
          plannedLectureCount: course.plannedLectureCount,
          meetingUrl: course.meetingUrl,
          whatsappGroupUrl: course.whatsappGroupUrl,
          publishedAt: course.publishedAt,
          archivedAt: course.archivedAt,
        },
      });
    }

    const academyLearners = [
      {
        id: uuid('curated-learner-patient-a'),
        fullName: 'Ahmed Mahmoud',
        phoneNumber: '+201000000001',
        whatsappNumber: '+201000000001',
        email: 'ahmed.patient@hesba.local',
        countryCode: 'EG',
        countryCodeDeclared: 'EG',
        countryCodeSource: 'profile',
        countryCodeMismatch: false,
        sourceLabel: 'patient-profile',
      },
      {
        id: uuid('curated-learner-patient-b'),
        fullName: 'Mohamed Abdelfattah',
        phoneNumber: '+971500000002',
        whatsappNumber: '+971500000002',
        email: 'mohamed.patient@hesba.local',
        countryCode: 'AE',
        countryCodeDeclared: 'AE',
        countryCodeSource: 'profile',
        countryCodeMismatch: false,
        sourceLabel: 'patient-profile',
      },
      {
        id: uuid('curated-learner-patient-c'),
        fullName: 'Omar Kareem',
        phoneNumber: '+201000000099',
        whatsappNumber: '+201000000099',
        email: 'omar.patient@hesba.local',
        countryCode: 'EG',
        countryCodeDeclared: 'EG',
        countryCodeSource: 'profile',
        countryCodeMismatch: false,
        sourceLabel: 'patient-profile',
      },
    ] as const;

    for (const learner of academyLearners) {
      await prisma.academyLearner.upsert({
        where: { phoneNumber: learner.phoneNumber },
        create: learner,
        update: {
          fullName: learner.fullName,
          whatsappNumber: learner.whatsappNumber,
          email: learner.email,
          countryCode: learner.countryCode,
          countryCodeDeclared: learner.countryCodeDeclared,
          countryCodeSource: learner.countryCodeSource,
          countryCodeMismatch: learner.countryCodeMismatch,
          sourceLabel: learner.sourceLabel,
        },
      });
    }

    const academyCourse = await prisma.academyCourse.findUniqueOrThrow({
      where: { slug: 'anxiety-foundations-101' },
    });
    const academyLearnerA = await prisma.academyLearner.findUniqueOrThrow({
      where: { phoneNumber: '+201000000001' },
    });
    const academyLearnerB = await prisma.academyLearner.findUniqueOrThrow({
      where: { phoneNumber: '+971500000002' },
    });
    const academyLearnerC = await prisma.academyLearner.findUniqueOrThrow({
      where: { phoneNumber: '+201000000099' },
    });

    const lectures = [
      {
        id: uuid('curated-academy-lecture-1'),
        academyCourseId: academyCourse.id,
        lectureOrder: 1,
        lectureTitle: 'Understanding triggers',
        startsAt: daysFromNow(7),
        endsAt: daysFromNow(7),
        createdByUserId: seedIds.users.practitionerB,
      },
      {
        id: uuid('curated-academy-lecture-2'),
        academyCourseId: academyCourse.id,
        lectureOrder: 2,
        lectureTitle: 'Body cues and early signals',
        startsAt: daysFromNow(9),
        endsAt: daysFromNow(9),
        createdByUserId: seedIds.users.practitionerB,
      },
      {
        id: uuid('curated-academy-lecture-3'),
        academyCourseId: academyCourse.id,
        lectureOrder: 3,
        lectureTitle: 'Calm response planning',
        startsAt: daysFromNow(11),
        endsAt: daysFromNow(11),
        createdByUserId: seedIds.users.practitionerB,
      },
    ] as const;

    for (const lecture of lectures) {
      await prisma.academyCourseLecture.upsert({
        where: {
          academyCourseId_lectureOrder: {
            academyCourseId: lecture.academyCourseId,
            lectureOrder: lecture.lectureOrder,
          },
        },
        create: lecture,
        update: {
          lectureTitle: lecture.lectureTitle,
          startsAt: lecture.startsAt,
          endsAt: lecture.endsAt,
          createdByUserId: lecture.createdByUserId,
        },
      });
    }

    const academyEnrollments = [
      {
        id: uuid('curated-academy-enrollment-a'),
        academyCourseId: academyCourse.id,
        academyLearnerId: academyLearnerA.id,
        publicAccessToken: 'academy-access-token-a',
        enrollmentStatus: AcademyEnrollmentStatus.CONFIRMED,
        paymentStatus: 'CAPTURED',
        paymentId: null,
        registeredAt: daysAgo(5),
        confirmedAt: daysAgo(4),
        cancelledAt: null,
        failedAt: null,
        failedReason: null,
        notesInternal: 'QA enrollment for progress and payment visibility.',
      },
      {
        id: uuid('curated-academy-enrollment-b'),
        academyCourseId: academyCourse.id,
        academyLearnerId: academyLearnerB.id,
        publicAccessToken: 'academy-access-token-b',
        enrollmentStatus: AcademyEnrollmentStatus.PAYMENT_FAILED,
        paymentStatus: 'FAILED',
        paymentId: null,
        registeredAt: daysAgo(6),
        confirmedAt: null,
        cancelledAt: null,
        failedAt: daysAgo(6),
        failedReason: 'Card declined',
        notesInternal: 'Failed enrollment kept for QA retry flows.',
      },
      {
        id: uuid('curated-academy-enrollment-c'),
        academyCourseId: academyCourse.id,
        academyLearnerId: academyLearnerC.id,
        publicAccessToken: 'academy-access-token-c',
        enrollmentStatus: AcademyEnrollmentStatus.PAID,
        paymentStatus: 'PAID',
        paymentId: null,
        registeredAt: daysAgo(1),
        confirmedAt: null,
        cancelledAt: null,
        failedAt: null,
        failedReason: null,
        notesInternal: 'Paid but not yet confirmed to test progress states.',
      },
    ] as const;

    for (const enrollment of academyEnrollments) {
      await prisma.academyEnrollment.upsert({
        where: {
          academyCourseId_academyLearnerId: {
            academyCourseId: enrollment.academyCourseId,
            academyLearnerId: enrollment.academyLearnerId,
          },
        },
        create: enrollment,
        update: {
          publicAccessToken: enrollment.publicAccessToken,
          enrollmentStatus: enrollment.enrollmentStatus,
          paymentStatus: enrollment.paymentStatus,
          paymentId: enrollment.paymentId,
          registeredAt: enrollment.registeredAt,
          confirmedAt: enrollment.confirmedAt,
          cancelledAt: enrollment.cancelledAt,
          failedAt: enrollment.failedAt,
          failedReason: enrollment.failedReason,
          notesInternal: enrollment.notesInternal,
        },
      });
    }

    const academyPayments = [
      {
        id: uuid('curated-academy-payment-a'),
        academyCourseId: academyCourse.id,
        provider: patientARegion.provider,
        status: PaymentStatus.CAPTURED,
        amountSubtotal: money(750),
        amountDiscount: money(0),
        amountTotal: money(750),
        currencyCode: patientARegion.currencyCode,
        providerPaymentRef: 'academy-payment-a',
        providerOrderRef: 'academy-order-a',
        providerCustomerRef: 'academy-customer-a',
        checkoutUrl: 'https://checkout.local/academy/anxiety-foundations',
        clientSecret: 'secret-curated-academy-a',
        failureReason: null,
      },
      {
        id: uuid('curated-academy-payment-b'),
        academyCourseId: academyCourse.id,
        provider: patientBRegion.provider,
        status: PaymentStatus.FAILED,
        amountSubtotal: money(24),
        amountDiscount: money(0),
        amountTotal: money(24),
        currencyCode: patientBRegion.currencyCode,
        providerPaymentRef: 'academy-payment-b',
        providerOrderRef: 'academy-order-b',
        providerCustomerRef: 'academy-customer-b',
        checkoutUrl: 'https://checkout.local/academy/anxiety-foundations',
        clientSecret: 'secret-curated-academy-b',
        failureReason: 'Card declined',
      },
    ] as const;

    for (const payment of academyPayments) {
      await prisma.academyPaymentAttempt.upsert({
        where: { id: payment.id },
        create: {
          id: payment.id,
          academyCourseId: payment.academyCourseId,
          academyEnrollmentId:
            payment.id === uuid('curated-academy-payment-a')
              ? uuid('curated-academy-enrollment-a')
              : uuid('curated-academy-enrollment-b'),
          paymentId: null,
          provider: payment.provider,
          status: payment.status,
          amountSubtotal: payment.amountSubtotal,
          amountDiscount: payment.amountDiscount,
          amountTotal: payment.amountTotal,
          currencyCode: payment.currencyCode,
          providerPaymentRef: payment.providerPaymentRef,
          providerOrderRef: payment.providerOrderRef,
          providerCustomerRef: payment.providerCustomerRef,
          checkoutUrl: payment.checkoutUrl,
          clientSecret: payment.clientSecret,
          failureReason: payment.failureReason,
        },
        update: {
          academyCourseId: payment.academyCourseId,
          provider: payment.provider,
          status: payment.status,
          amountSubtotal: payment.amountSubtotal,
          amountDiscount: payment.amountDiscount,
          amountTotal: payment.amountTotal,
          currencyCode: payment.currencyCode,
          providerPaymentRef: payment.providerPaymentRef,
          providerOrderRef: payment.providerOrderRef,
          providerCustomerRef: payment.providerCustomerRef,
          checkoutUrl: payment.checkoutUrl,
          clientSecret: payment.clientSecret,
          failureReason: payment.failureReason,
        },
      });
    }

    const academyActivityLogs = [
      {
        id: uuid('curated-academy-log-a-1'),
        academyCourseId: academyCourse.id,
        academyEnrollmentId: uuid('curated-academy-enrollment-a'),
        action: 'ENROLLMENT_CREATED',
        note: 'Enrollment created from mobile.',
        createdByUserId: patientAUserId,
      },
      {
        id: uuid('curated-academy-log-a-2'),
        academyCourseId: academyCourse.id,
        academyEnrollmentId: uuid('curated-academy-enrollment-a'),
        action: 'PAYMENT_CAPTURED',
        note: 'Payment captured through Paymob.',
        createdByUserId: patientAUserId,
      },
      {
        id: uuid('curated-academy-log-a-3'),
        academyCourseId: academyCourse.id,
        academyEnrollmentId: uuid('curated-academy-enrollment-a'),
        action: 'ENROLLMENT_CONFIRMED',
        note: 'Enrollment confirmed and ready for progress tracking.',
        createdByUserId: supportUserId,
      },
      {
        id: uuid('curated-academy-log-b-1'),
        academyCourseId: academyCourse.id,
        academyEnrollmentId: uuid('curated-academy-enrollment-b'),
        action: 'PAYMENT_FAILED',
        note: 'Stripe attempt failed during checkout.',
        createdByUserId: patientBUserId,
      },
      {
        id: uuid('curated-academy-log-c-1'),
        academyCourseId: academyCourse.id,
        academyEnrollmentId: uuid('curated-academy-enrollment-c'),
        action: 'PAYMENT_PAID',
        note: 'Pending manual confirmation state.',
        createdByUserId: patientCUserId,
      },
    ] as const;

    for (const log of academyActivityLogs) {
      await prisma.academyEnrollmentActivityLog.upsert({
        where: { id: log.id },
        create: log,
        update: {
          academyCourseId: log.academyCourseId,
          academyEnrollmentId: log.academyEnrollmentId,
          action: log.action,
          note: log.note,
          createdByUserId: log.createdByUserId,
        },
      });
    }

    await prisma.practitionerPresence.upsert({
      where: { practitionerId: seedIds.practitionerProfiles.practitionerB },
      create: {
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        status: PresenceStatus.ONLINE,
        isInstantBookingEnabled: true,
        lastSeenAtUtc: daysAgo(0),
        lastHeartbeatAtUtc: daysAgo(0),
        manuallySetAtUtc: daysAgo(0),
      },
      update: {
        status: PresenceStatus.ONLINE,
        isInstantBookingEnabled: true,
        lastSeenAtUtc: daysAgo(0),
        lastHeartbeatAtUtc: daysAgo(0),
        manuallySetAtUtc: daysAgo(0),
      },
    });

    await prisma.practitionerPresence.upsert({
      where: { practitionerId: seedIds.practitionerProfiles.practitionerE },
      create: {
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        status: PresenceStatus.AWAY,
        isInstantBookingEnabled: true,
        lastSeenAtUtc: daysAgo(1),
        lastHeartbeatAtUtc: daysAgo(1),
        manuallySetAtUtc: daysAgo(1),
      },
      update: {
        status: PresenceStatus.AWAY,
        isInstantBookingEnabled: true,
        lastSeenAtUtc: daysAgo(1),
        lastHeartbeatAtUtc: daysAgo(1),
        manuallySetAtUtc: daysAgo(1),
      },
    });

    await prisma.practitionerPresence.deleteMany({
      where: {
        practitionerId: seedIds.practitionerProfiles.practitionerD,
      },
    });

    await prisma.practitionerApplication.update({
      where: { id: seedIds.practitionerApplications.practitionerA },
      data: {
        status: PractitionerApplicationStatus.SUBMITTED,
      },
    });

    await prisma.practitionerApplication.update({
      where: { id: seedIds.practitionerApplications.practitionerB },
      data: {
        status: PractitionerApplicationStatus.APPROVED,
      },
    });

    await prisma.practitionerApplication.update({
      where: { id: seedIds.practitionerApplications.practitionerD },
      data: {
        status: PractitionerApplicationStatus.UNDER_REVIEW,
      },
    });

    await prisma.practitionerProfile.update({
      where: { id: seedIds.practitionerProfiles.practitionerA },
      data: {
        status: PractitionerStatus.PENDING_REVIEW,
        isPublicProfilePublished: false,
      },
    });

    await prisma.practitionerProfile.update({
      where: { id: seedIds.practitionerProfiles.practitionerB },
      data: {
        status: PractitionerStatus.APPROVED,
        isPublicProfilePublished: true,
      },
    });

    await prisma.practitionerProfile.update({
      where: { id: seedIds.practitionerProfiles.practitionerD },
      data: {
        status: PractitionerStatus.PENDING_REVIEW,
        isPublicProfilePublished: false,
      },
    });

    await prisma.sessionReview.upsert({
      where: { sessionId: uuid('curated-session-intl-completed') },
      create: {
        id: uuid('curated-review-intl-completed'),
        sessionId: uuid('curated-session-intl-completed'),
        patientId: seedIds.patientProfiles.patientB,
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        ratingValue: 5,
        reviewTitle: 'Calm and helpful',
        reviewText: 'The session was structured, clear, and very calming.',
        reviewStatus: SessionReviewStatus.PUBLISHED,
        isAnonymous: false,
        isFeatured: true,
        submittedAt: daysAgo(16),
        publishedAt: daysAgo(15),
        hiddenAt: null,
        archivedAt: null,
      },
      update: {
        ratingValue: 5,
        reviewTitle: 'Calm and helpful',
        reviewText: 'The session was structured, clear, and very calming.',
        reviewStatus: SessionReviewStatus.PUBLISHED,
        isAnonymous: false,
        isFeatured: true,
        submittedAt: daysAgo(16),
        publishedAt: daysAgo(15),
      },
    });
  },
};
