import {
  AvailabilityWeekStatus,
  AvailabilityWeekday,
  CredentialReviewStatus,
  CredentialType,
  PresenceStatus,
  PractitionerApplicationStatus,
  PractitionerStatus,
  PractitionerType,
  PrismaClient,
} from '@prisma/client';
import { createHash } from 'crypto';
import { seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';
import { daysAgo, daysFromNow } from '../shared/seed.utils';

function deterministicUuid(seed: string): string {
  const hash = createHash('md5').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(
    13,
    16,
  )}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function getSundayBasedWeekRange(baseDate: Date, weekOffset = 0) {
  const weekStartDate = new Date(baseDate);
  weekStartDate.setUTCHours(0, 0, 0, 0);
  weekStartDate.setUTCDate(
    weekStartDate.getUTCDate() - weekStartDate.getUTCDay() + weekOffset * 7,
  );

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);

  return { weekStartDate, weekEndDate };
}

/**
 * Practitioners seed module owns practitioner profile graph:
 * profile, languages, specialties linkage, credentials, applications, and rating summary.
 *
 * The goal is realistic discovery/testing coverage:
 * - each specialty has public-ready practitioners
 * - mixed lifecycle states are represented (approved/pending/rejected)
 * - public listing can be tested with search/filter/sort/pagination
 */
export const practitionersSeedModule: SeedModule = {
  name: 'practitioners',
  async run(prisma: PrismaClient): Promise<void> {
    const profiles = [
      {
        id: seedIds.practitionerProfiles.practitionerA,
        userId: seedIds.users.practitionerA,
        countryId: seedIds.countries.egypt,
        practitionerType: PractitionerType.PSYCHOLOGIST,
        publicSlug: 'dr-ahmed-mohamed',
        professionalTitle: 'أخصائي نفسي إكلينيكي',
        bio: 'أخصائي نفسي بخبرة عملية في علاج القلق واضطرابات المزاج.',
        yearsOfExperience: 8,
        sessionPrice30: '300',
        sessionPrice60: '550',
        acceptsPackages: true,
        status: PractitionerStatus.PENDING_REVIEW,
        isPublicProfilePublished: false,
      },
      {
        id: seedIds.practitionerProfiles.practitionerB,
        userId: seedIds.users.practitionerB,
        countryId: seedIds.countries.saudiArabia,
        practitionerType: PractitionerType.PSYCHIATRIST,
        publicSlug: 'dr-mohamed-mahmoud',
        professionalTitle: 'استشاري طب نفسي',
        bio: 'استشاري طب نفسي بخبرة طويلة في التشخيص وخطط العلاج المتكاملة.',
        yearsOfExperience: 14,
        sessionPrice30: '420',
        sessionPrice60: '760',
        acceptsPackages: true,
        status: PractitionerStatus.APPROVED,
        isPublicProfilePublished: true,
      },
      {
        id: seedIds.practitionerProfiles.practitionerC,
        userId: seedIds.users.practitionerC,
        countryId: seedIds.countries.uae,
        practitionerType: PractitionerType.NUTRITIONIST,
        publicSlug: 'dr-mahmoud-ali',
        professionalTitle: 'أخصائي تغذية علاجية',
        bio: 'أخصائي تغذية علاجية يركز على إدارة الأكل العاطفي وتعديل السلوك الغذائي.',
        yearsOfExperience: 6,
        sessionPrice30: '260',
        sessionPrice60: '480',
        acceptsPackages: true,
        status: PractitionerStatus.REJECTED,
        isPublicProfilePublished: false,
      },
      {
        id: seedIds.practitionerProfiles.practitionerD,
        userId: seedIds.users.practitionerD,
        countryId: seedIds.countries.kuwait,
        practitionerType: PractitionerType.COUNSELOR,
        publicSlug: 'dr-abdelfattah-ali',
        professionalTitle: 'مرشد أسري ونفسي',
        bio: 'مرشد أسري متخصص في حل النزاعات الزوجية وتحسين التواصل داخل الأسرة.',
        yearsOfExperience: 7,
        sessionPrice30: '280',
        sessionPrice60: '520',
        acceptsPackages: true,
        status: PractitionerStatus.PENDING_REVIEW,
        isPublicProfilePublished: false,
      },
      {
        id: seedIds.practitionerProfiles.practitionerE,
        userId: seedIds.users.practitionerE,
        countryId: seedIds.countries.egypt,
        practitionerType: PractitionerType.PSYCHOLOGIST,
        publicSlug: 'dr-youssef-abdallah',
        professionalTitle: 'معالج القلق والضغوط',
        bio: 'معالج نفسي يقدّم برامج عملية للتعامل مع القلق والضغط النفسي اليومي.',
        yearsOfExperience: 10,
        sessionPrice30: '350',
        sessionPrice60: '650',
        acceptsPackages: true,
        status: PractitionerStatus.APPROVED,
        isPublicProfilePublished: true,
      },
      {
        id: seedIds.practitionerProfiles.practitionerF,
        userId: seedIds.users.practitionerF,
        countryId: seedIds.countries.saudiArabia,
        practitionerType: PractitionerType.PSYCHOLOGIST,
        publicSlug: 'dr-karim-hassan',
        professionalTitle: 'معالج الاكتئاب',
        bio: 'معالج نفسي يركز على التعافي من الاكتئاب وخطط الوقاية من الانتكاس.',
        yearsOfExperience: 11,
        sessionPrice30: '390',
        sessionPrice60: '720',
        acceptsPackages: true,
        status: PractitionerStatus.APPROVED,
        isPublicProfilePublished: true,
      },
      {
        id: seedIds.practitionerProfiles.practitionerG,
        userId: seedIds.users.practitionerG,
        countryId: seedIds.countries.uae,
        practitionerType: PractitionerType.WEIGHT_LOSS_SPECIALIST,
        publicSlug: 'dr-sara-khaled',
        professionalTitle: 'أخصائية رياضة وتأهيل',
        bio: 'أخصائية تأهيل رياضي لتحسين اللياقة والتعافي بعد الإصابات الرياضية.',
        yearsOfExperience: 9,
        sessionPrice30: '320',
        sessionPrice60: '580',
        acceptsPackages: true,
        status: PractitionerStatus.APPROVED,
        isPublicProfilePublished: true,
      },
      {
        id: seedIds.practitionerProfiles.practitionerH,
        userId: seedIds.users.practitionerH,
        countryId: seedIds.countries.kuwait,
        practitionerType: PractitionerType.WEIGHT_LOSS_SPECIALIST,
        publicSlug: 'dr-nour-hani',
        professionalTitle: 'أخصائية أداء رياضي',
        bio: 'أخصائية برامج أداء رياضي لتحسين القوة والتحمل والجاهزية البدنية.',
        yearsOfExperience: 12,
        sessionPrice30: '360',
        sessionPrice60: '680',
        acceptsPackages: true,
        status: PractitionerStatus.APPROVED,
        isPublicProfilePublished: true,
      },
      {
        id: seedIds.practitionerProfiles.practitionerI,
        userId: seedIds.users.practitionerI,
        countryId: seedIds.countries.qatar,
        practitionerType: PractitionerType.PSYCHOLOGIST,
        publicSlug: 'dr-mariam-ashraf',
        professionalTitle: 'أخصائية نفسية أطفال ومراهقين',
        bio: 'تقدّم جلسات نفسية مخصصة للأطفال والمراهقين بأساليب علمية حديثة.',
        yearsOfExperience: 13,
        sessionPrice30: '410',
        sessionPrice60: '760',
        acceptsPackages: true,
        status: PractitionerStatus.APPROVED,
        isPublicProfilePublished: true,
      },
      {
        id: seedIds.practitionerProfiles.practitionerJ,
        userId: seedIds.users.practitionerJ,
        countryId: seedIds.countries.egypt,
        practitionerType: PractitionerType.PSYCHOLOGIST,
        publicSlug: 'dr-hassan-tarek',
        professionalTitle: 'أخصائي نفسي متكامل',
        bio: 'أخصائي نفسي شامل يدعم القلق والاكتئاب مع برامج تعديل نمط الحياة.',
        yearsOfExperience: 15,
        sessionPrice30: '430',
        sessionPrice60: '790',
        acceptsPackages: true,
        status: PractitionerStatus.APPROVED,
        isPublicProfilePublished: true,
      },
    ];

    for (const profile of profiles) {
      await prisma.practitionerProfile.upsert({
        where: { userId: profile.userId },
        create: profile,
        update: {
          countryId: profile.countryId,
          practitionerType: profile.practitionerType,
          publicSlug: profile.publicSlug,
          professionalTitle: profile.professionalTitle,
          bio: profile.bio,
          yearsOfExperience: profile.yearsOfExperience,
          sessionPrice30: profile.sessionPrice30,
          sessionPrice60: profile.sessionPrice60,
          acceptsPackages: profile.acceptsPackages,
          status: profile.status,
          isPublicProfilePublished: profile.isPublicProfilePublished,
        },
      });
    }

    const profileLanguages: Array<{
      practitionerId: string;
      languageId: string;
      isPrimary: boolean;
    }> = [
      {
        practitionerId: seedIds.practitionerProfiles.practitionerA,
        languageId: seedIds.languages.arabic,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerA,
        languageId: seedIds.languages.english,
        isPrimary: false,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        languageId: seedIds.languages.english,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerC,
        languageId: seedIds.languages.arabic,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerD,
        languageId: seedIds.languages.arabic,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        languageId: seedIds.languages.arabic,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        languageId: seedIds.languages.english,
        isPrimary: false,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerF,
        languageId: seedIds.languages.english,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerG,
        languageId: seedIds.languages.english,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerG,
        languageId: seedIds.languages.arabic,
        isPrimary: false,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerH,
        languageId: seedIds.languages.arabic,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerI,
        languageId: seedIds.languages.english,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerI,
        languageId: seedIds.languages.arabic,
        isPrimary: false,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerJ,
        languageId: seedIds.languages.arabic,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerJ,
        languageId: seedIds.languages.english,
        isPrimary: false,
      },
    ];

    for (const link of profileLanguages) {
      await prisma.practitionerProfileLanguage.upsert({
        where: {
          practitionerId_languageId: {
            practitionerId: link.practitionerId,
            languageId: link.languageId,
          },
        },
        create: link,
        update: {
          isPrimary: link.isPrimary,
        },
      });
    }

    const practitionerSpecialties: Array<{
      practitionerId: string;
      specialtyId: string;
      isPrimary: boolean;
    }> = [
      {
        practitionerId: seedIds.practitionerProfiles.practitionerA,
        specialtyId: seedIds.specialties.anxiety,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerA,
        specialtyId: seedIds.specialties.depression,
        isPrimary: false,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        specialtyId: seedIds.specialties.familyCounseling,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerC,
        specialtyId: seedIds.specialties.nutrition,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerC,
        specialtyId: seedIds.specialties.emotionalEating,
        isPrimary: false,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerD,
        specialtyId: seedIds.specialties.childPsychology,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        specialtyId: seedIds.specialties.anxiety,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        specialtyId: seedIds.specialties.weightManagement,
        isPrimary: false,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerF,
        specialtyId: seedIds.specialties.depression,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerG,
        specialtyId: seedIds.specialties.sportsInjuryRehab,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerG,
        specialtyId: seedIds.specialties.athleticPerformance,
        isPrimary: false,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerH,
        specialtyId: seedIds.specialties.athleticPerformance,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerH,
        specialtyId: seedIds.specialties.sportsInjuryRehab,
        isPrimary: false,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerI,
        specialtyId: seedIds.specialties.childPsychology,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerI,
        specialtyId: seedIds.specialties.anxiety,
        isPrimary: false,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerJ,
        specialtyId: seedIds.specialties.depression,
        isPrimary: true,
      },
      {
        practitionerId: seedIds.practitionerProfiles.practitionerJ,
        specialtyId: seedIds.specialties.weightManagement,
        isPrimary: false,
      },
    ];

    await prisma.practitionerSpecialty.deleteMany({
      where: {
        practitionerId: {
          in: Object.values(seedIds.practitionerProfiles),
        },
      },
    });

    for (const link of practitionerSpecialties) {
      await prisma.practitionerSpecialty.create({
        data: link,
      });
    }

    const weeklyAvailability: Array<{
      week: {
        id: string;
        practitionerId: string;
        weekStartDate: Date;
        weekEndDate: Date;
        timezone: string;
        status: AvailabilityWeekStatus;
        publishedAt: Date;
        archivedAt: null;
      };
      slots: Array<{
        id: string;
        weekday: AvailabilityWeekday;
        startMinuteOfDay: number;
        endMinuteOfDay: number;
        durationMinutes: 30;
        timezone: string;
      }>;
    }> = [];

    const weekdays = [
      AvailabilityWeekday.SUNDAY,
      AvailabilityWeekday.MONDAY,
      AvailabilityWeekday.TUESDAY,
      AvailabilityWeekday.WEDNESDAY,
      AvailabilityWeekday.THURSDAY,
    ];

    const practitionerIds = Object.values(seedIds.practitionerProfiles);
    const baseDate = new Date();
    for (let i = 0; i < practitionerIds.length; i += 1) {
      const practitionerId = practitionerIds[i];
      const timezone =
        i % 3 === 0
          ? 'Africa/Cairo'
          : i % 3 === 1
            ? 'Asia/Riyadh'
            : 'Asia/Dubai';
      for (const weekOffset of [0, 1]) {
        const range = getSundayBasedWeekRange(baseDate, weekOffset);
        const weekId = deterministicUuid(
          `avail-week-${practitionerId}-${range.weekStartDate.toISOString().slice(0, 10)}`,
        );

        weeklyAvailability.push({
          week: {
            id: weekId,
            practitionerId,
            weekStartDate: range.weekStartDate,
            weekEndDate: range.weekEndDate,
            timezone,
            status: AvailabilityWeekStatus.PUBLISHED,
            publishedAt: range.weekStartDate,
            archivedAt: null,
          },
          slots: weekdays.map((weekday) => ({
            id: deterministicUuid(
              `avail-slot-${weekId}-${weekday}-${10 * 60 + (i % 3) * 60}`,
            ),
            weekday,
            startMinuteOfDay: 10 * 60 + (i % 3) * 60,
            endMinuteOfDay: 18 * 60 + (i % 2) * 30,
            durationMinutes: 30,
            timezone,
          })),
        });
      }
    }

    for (const availability of weeklyAvailability) {
      await prisma.practitionerAvailabilityWeek.upsert({
        where: { id: availability.week.id },
        create: {
          ...availability.week,
          slots: {
            create: availability.slots,
          },
        },
        update: {
          practitionerId: availability.week.practitionerId,
          weekStartDate: availability.week.weekStartDate,
          weekEndDate: availability.week.weekEndDate,
          timezone: availability.week.timezone,
          status: availability.week.status,
          publishedAt: availability.week.publishedAt,
          archivedAt: availability.week.archivedAt,
          slots: {
            deleteMany: {},
            create: availability.slots,
          },
        },
      });
    }

    for (let i = 0; i < practitionerIds.length; i += 1) {
      const practitionerId = practitionerIds[i];
      await prisma.practitionerPresence.upsert({
        where: { practitionerId },
        create: {
          practitionerId,
          status: PresenceStatus.OFFLINE,
          isInstantBookingEnabled: false,
          lastSeenAtUtc: null,
          lastHeartbeatAtUtc: null,
          manuallySetAtUtc: null,
        },
        update: {
          status: PresenceStatus.OFFLINE,
          isInstantBookingEnabled: false,
          lastSeenAtUtc: null,
          lastHeartbeatAtUtc: null,
          manuallySetAtUtc: null,
        },
      });
    }

    const credentials = [
      {
        id: seedIds.credentials.aLicense,
        practitionerId: seedIds.practitionerProfiles.practitionerA,
        credentialType: CredentialType.LICENSE,
        fileUrl: 'https://files.local/practitioner-a-license.pdf',
        reviewStatus: CredentialReviewStatus.PENDING,
        expiresAt: daysFromNow(365),
      },
      {
        id: seedIds.credentials.aDegree,
        practitionerId: seedIds.practitionerProfiles.practitionerA,
        credentialType: CredentialType.DEGREE,
        fileUrl: 'https://files.local/practitioner-a-degree.pdf',
        reviewStatus: CredentialReviewStatus.APPROVED,
        expiresAt: null,
      },
      {
        id: seedIds.credentials.bLicense,
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        credentialType: CredentialType.LICENSE,
        fileUrl: 'https://files.local/practitioner-b-license.pdf',
        reviewStatus: CredentialReviewStatus.APPROVED,
        expiresAt: daysFromNow(540),
      },
      {
        id: seedIds.credentials.cLicense,
        practitionerId: seedIds.practitionerProfiles.practitionerC,
        credentialType: CredentialType.CERTIFICATION,
        fileUrl: 'https://files.local/practitioner-c-certification.pdf',
        reviewStatus: CredentialReviewStatus.REJECTED,
        expiresAt: null,
      },
      {
        id: seedIds.credentials.dLicense,
        practitionerId: seedIds.practitionerProfiles.practitionerD,
        credentialType: CredentialType.LICENSE,
        fileUrl: 'https://files.local/practitioner-d-license.pdf',
        reviewStatus: CredentialReviewStatus.PENDING,
        expiresAt: daysFromNow(400),
      },
      {
        id: seedIds.credentials.eLicense,
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        credentialType: CredentialType.LICENSE,
        fileUrl: 'https://files.local/practitioner-e-license.pdf',
        reviewStatus: CredentialReviewStatus.APPROVED,
        expiresAt: daysFromNow(480),
      },
      {
        id: seedIds.credentials.fLicense,
        practitionerId: seedIds.practitionerProfiles.practitionerF,
        credentialType: CredentialType.CERTIFICATION,
        fileUrl: 'https://files.local/practitioner-f-certification.pdf',
        reviewStatus: CredentialReviewStatus.APPROVED,
        expiresAt: daysFromNow(365),
      },
      {
        id: seedIds.credentials.gLicense,
        practitionerId: seedIds.practitionerProfiles.practitionerG,
        credentialType: CredentialType.DEGREE,
        fileUrl: 'https://files.local/practitioner-g-degree.pdf',
        reviewStatus: CredentialReviewStatus.APPROVED,
        expiresAt: null,
      },
      {
        id: seedIds.credentials.hLicense,
        practitionerId: seedIds.practitionerProfiles.practitionerH,
        credentialType: CredentialType.LICENSE,
        fileUrl: 'https://files.local/practitioner-h-license.pdf',
        reviewStatus: CredentialReviewStatus.APPROVED,
        expiresAt: daysFromNow(365),
      },
      {
        id: seedIds.credentials.iLicense,
        practitionerId: seedIds.practitionerProfiles.practitionerI,
        credentialType: CredentialType.CERTIFICATION,
        fileUrl: 'https://files.local/practitioner-i-certification.pdf',
        reviewStatus: CredentialReviewStatus.APPROVED,
        expiresAt: daysFromNow(365),
      },
      {
        id: seedIds.credentials.jLicense,
        practitionerId: seedIds.practitionerProfiles.practitionerJ,
        credentialType: CredentialType.LICENSE,
        fileUrl: 'https://files.local/practitioner-j-license.pdf',
        reviewStatus: CredentialReviewStatus.APPROVED,
        expiresAt: daysFromNow(365),
      },
    ];

    for (const credential of credentials) {
      await prisma.practitionerCredential.upsert({
        where: { id: credential.id },
        create: credential,
        update: {
          credentialType: credential.credentialType,
          fileUrl: credential.fileUrl,
          reviewStatus: credential.reviewStatus,
          expiresAt: credential.expiresAt,
        },
      });
    }

    const applications = [
      {
        id: seedIds.practitionerApplications.practitionerA,
        practitionerId: seedIds.practitionerProfiles.practitionerA,
        status: PractitionerApplicationStatus.SUBMITTED,
        submittedAt: daysAgo(3),
        reviewedAt: null,
        reviewNotes: null,
      },
      {
        id: seedIds.practitionerApplications.practitionerB,
        practitionerId: seedIds.practitionerProfiles.practitionerB,
        status: PractitionerApplicationStatus.APPROVED,
        submittedAt: daysAgo(28),
        reviewedAt: daysAgo(20),
        reviewNotes: 'Application approved after full verification.',
      },
      {
        id: seedIds.practitionerApplications.practitionerC,
        practitionerId: seedIds.practitionerProfiles.practitionerC,
        status: PractitionerApplicationStatus.REJECTED,
        submittedAt: daysAgo(15),
        reviewedAt: daysAgo(8),
        reviewNotes: 'Reason: Missing updated certification documents.',
      },
      {
        id: seedIds.practitionerApplications.practitionerD,
        practitionerId: seedIds.practitionerProfiles.practitionerD,
        status: PractitionerApplicationStatus.UNDER_REVIEW,
        submittedAt: daysAgo(2),
        reviewedAt: null,
        reviewNotes: null,
      },
      {
        id: seedIds.practitionerApplications.practitionerE,
        practitionerId: seedIds.practitionerProfiles.practitionerE,
        status: PractitionerApplicationStatus.APPROVED,
        submittedAt: daysAgo(35),
        reviewedAt: daysAgo(27),
        reviewNotes: 'Approved with complete profile and credentials.',
      },
      {
        id: seedIds.practitionerApplications.practitionerF,
        practitionerId: seedIds.practitionerProfiles.practitionerF,
        status: PractitionerApplicationStatus.APPROVED,
        submittedAt: daysAgo(22),
        reviewedAt: daysAgo(17),
        reviewNotes: 'Approved after readiness review.',
      },
      {
        id: seedIds.practitionerApplications.practitionerG,
        practitionerId: seedIds.practitionerProfiles.practitionerG,
        status: PractitionerApplicationStatus.APPROVED,
        submittedAt: daysAgo(19),
        reviewedAt: daysAgo(14),
        reviewNotes: 'Approved and cleared for public listing.',
      },
      {
        id: seedIds.practitionerApplications.practitionerH,
        practitionerId: seedIds.practitionerProfiles.practitionerH,
        status: PractitionerApplicationStatus.APPROVED,
        submittedAt: daysAgo(26),
        reviewedAt: daysAgo(18),
        reviewNotes: 'Approved after family-counseling scope verification.',
      },
      {
        id: seedIds.practitionerApplications.practitionerI,
        practitionerId: seedIds.practitionerProfiles.practitionerI,
        status: PractitionerApplicationStatus.APPROVED,
        submittedAt: daysAgo(31),
        reviewedAt: daysAgo(23),
        reviewNotes: 'Approved with child-psychology credentials validated.',
      },
      {
        id: seedIds.practitionerApplications.practitionerJ,
        practitionerId: seedIds.practitionerProfiles.practitionerJ,
        status: PractitionerApplicationStatus.APPROVED,
        submittedAt: daysAgo(40),
        reviewedAt: daysAgo(30),
        reviewNotes: 'Approved as senior integrated practitioner.',
      },
    ];

    for (const application of applications) {
      await prisma.practitionerApplication.upsert({
        where: { id: application.id },
        create: application,
        update: {
          status: application.status,
          submittedAt: application.submittedAt,
          reviewedAt: application.reviewedAt,
          reviewNotes: application.reviewNotes,
        },
      });
    }

  },
};
