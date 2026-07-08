import {
  ArticleStatus,
  ArticleVisibility,
  AssessmentResultBand,
  AssessmentSubmissionStatus,
  AuthProvider,
  AvailabilityWeekStatus,
  AvailabilityWeekday,
  ContentLocale,
  ConversationParticipantRole,
  ConversationStatus,
  ConversationType,
  CourseDeliveryMode,
  CourseReviewDecision,
  CourseScheduleStatus,
  CourseStatus,
  CourseType,
  CourseVisibility,
  EnrollmentAttendanceStatus,
  EnrollmentStatus,
  LedgerDirection,
  LedgerEntryType,
  MatchingAnswerKey,
  MatchingSessionStatus,
  MessageStatus,
  MessageType,
  MessageVisibility,
  ModerationAuditEventType,
  ModerationCaseActionType,
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
  NotificationChannel,
  NotificationStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PractitionerGender,
  PractitionerSettlementStatus,
  PractitionerStatus,
  PractitionerType,
  PrismaClient,
  RefundStatus,
  RefundType,
  SessionFlowType,
  SessionMode,
  SessionProvider,
  SessionReviewStatus,
  SessionStatus,
  SettlementBatchStatus,
  SupportTicketEventType,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
  UserRoleType,
  UserStatus,
  WalletBalanceBucket,
} from '@prisma/client';
import { createHash } from 'crypto';
import { SeedModule } from '../shared/seed.types';
import { hashPassword } from '../shared/seed.utils';

type SeedScale = 'small' | 'medium' | 'large';
type ScaleConfig = {
  patients: number;
  practitioners: number;
  sessions: number;
  articles: number;
  conversations: number;
  messagesPerConversation: number;
  notificationsPerUser: number;
  courses: number;
};

const SCALE_CONFIG: Record<SeedScale, ScaleConfig> = {
  small: {
    patients: 30,
    practitioners: 20,
    sessions: 240,
    articles: 60,
    conversations: 90,
    messagesPerConversation: 5,
    notificationsPerUser: 8,
    courses: 10,
  },
  medium: {
    patients: 120,
    practitioners: 70,
    sessions: 1100,
    articles: 220,
    conversations: 420,
    messagesPerConversation: 8,
    notificationsPerUser: 14,
    courses: 28,
  },
  large: {
    patients: 300,
    practitioners: 180,
    sessions: 4000,
    articles: 700,
    conversations: 1200,
    messagesPerConversation: 10,
    notificationsPerUser: 20,
    courses: 80,
  },
};

const TIMEZONES = [
  'Africa/Cairo',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Kuwait',
  'Asia/Qatar',
  'Asia/Amman',
];

const NAMES = [
  'أحمد علي',
  'محمد حسن',
  'سارة محمود',
  'ياسمين خالد',
  'مريم سمير',
  'خالد عبد الله',
  'نوران شريف',
  'هبة جمال',
  'أدهم فؤاد',
  'رنا طارق',
];

function parseScale(value: string | undefined): SeedScale {
  if (value === 'small' || value === 'medium' || value === 'large') {
    return value;
  }
  return 'medium';
}

function uuid(seed: string): string {
  const h = createHash('md5').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
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

export function buildSettlementBatchSeedId(
  periodYear: number,
  periodMonth: number,
  currencyCode: string,
): string {
  return uuid(
    `regional-bulk-settlement-batch-${periodYear}-${periodMonth}-${currencyCode}`,
  );
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function money(base: number, delta: number, index: number): string {
  return (base + ((index % delta) - delta / 2)).toFixed(2);
}

const BULK_AVAILABILITY_WEEKDAYS = [
  AvailabilityWeekday.SUNDAY,
  AvailabilityWeekday.MONDAY,
  AvailabilityWeekday.TUESDAY,
  AvailabilityWeekday.WEDNESDAY,
  AvailabilityWeekday.THURSDAY,
];

export const regionalBulkSeedModule: SeedModule = {
  name: 'regional-bulk',
  async run(prisma: PrismaClient): Promise<void> {
    const scale = parseScale(process.env.SEED_SCALE);
    const cfg = SCALE_CONFIG[scale];
    const passwordHash = await hashPassword('Seed@123456');

    console.log(`[seed:regional-bulk] scale=${scale}`);

    const legacyLocalEmails = await prisma.userEmail.findMany({
      where: { email: { endsWith: '@fayed.local' } },
      select: {
        id: true,
        userId: true,
        email: true,
        isPrimary: true,
        isVerified: true,
      },
    });

    for (const legacyEmail of legacyLocalEmails) {
      const normalizedEmail = legacyEmail.email.replace(
        /@fayed\.local$/i,
        '@hesba.local',
      );
      await prisma.userEmail.upsert({
        where: { email: normalizedEmail },
        create: {
          id: uuid(`legacy-email-migration-${legacyEmail.id}`),
          userId: legacyEmail.userId,
          email: normalizedEmail,
          isPrimary: legacyEmail.isPrimary,
          isVerified: legacyEmail.isVerified,
        },
        update: {
          userId: legacyEmail.userId,
          isPrimary: legacyEmail.isPrimary,
          isVerified: legacyEmail.isVerified,
        },
      });

      await prisma.userEmail.delete({
        where: { id: legacyEmail.id },
      });
    }

    const countries = await prisma.country.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    const specialties = await prisma.specialty.findMany({
      where: { isActive: true },
      select: { id: true },
      orderBy: { sortOrder: 'asc' },
    });
    const languages = await prisma.language.findMany({
      where: { code: { in: ['ar', 'en'] } },
      select: { id: true, code: true },
    });

    if (
      countries.length === 0 ||
      specialties.length === 0 ||
      languages.length === 0
    ) {
      throw new Error(
        '[seed:regional-bulk] missing countries/specialties/languages. Run base seed first.',
      );
    }

    const arLanguageId =
      languages.find((l) => l.code === 'ar')?.id ?? languages[0].id;
    const enLanguageId =
      languages.find((l) => l.code === 'en')?.id ?? languages[0].id;

    const patientUsers: Array<{ userId: string; profileId: string }> = [];
    const practitionerUsers: Array<{ userId: string; profileId: string }> = [];

    for (let i = 1; i <= cfg.patients; i += 1) {
      const userId = uuid(`bulk-patient-user-${i}`);
      const profileId = uuid(`bulk-patient-profile-${i}`);
      const email = `patient.bulk.${i}@hesba.local`;
      const phone = `+2011${String(1000000 + i).slice(-7)}`;
      const countryId = pick(countries, i).id;

      await prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          displayName: `${pick(NAMES, i)} (مريض ${i})`,
          status: UserStatus.ACTIVE,
          defaultLocale: i % 3 === 0 ? 'en' : 'ar',
          timezone: pick(TIMEZONES, i),
        },
        update: {
          displayName: `${pick(NAMES, i)} (مريض ${i})`,
          status: UserStatus.ACTIVE,
          defaultLocale: i % 3 === 0 ? 'en' : 'ar',
          timezone: pick(TIMEZONES, i),
        },
      });

      await prisma.userRole.upsert({
        where: { userId_role: { userId, role: UserRoleType.PATIENT } },
        create: { userId, role: UserRoleType.PATIENT },
        update: {},
      });

      await prisma.userEmail.upsert({
        where: { email },
        create: {
          id: uuid(`bulk-patient-email-${i}`),
          userId,
          email,
          isPrimary: true,
          isVerified: true,
        },
        update: {
          userId,
          isPrimary: true,
          isVerified: true,
        },
      });

      await prisma.userEmail.deleteMany({
        where: {
          userId,
          email: {
            not: email,
          },
        },
      });

      await prisma.userPhone.upsert({
        where: { phone },
        create: {
          id: uuid(`bulk-patient-phone-${i}`),
          userId,
          phone,
          isPrimary: true,
          isVerified: i % 5 !== 0,
        },
        update: {
          userId,
          isPrimary: true,
          isVerified: i % 5 !== 0,
        },
      });

      const existingPassword = await prisma.authIdentity.findFirst({
        where: { userId, provider: AuthProvider.PASSWORD },
      });
      if (existingPassword) {
        await prisma.authIdentity.update({
          where: { id: existingPassword.id },
          data: { passwordHash, isEnabled: true },
        });
      } else {
        await prisma.authIdentity.create({
          data: {
            id: uuid(`bulk-patient-auth-${i}`),
            userId,
            provider: AuthProvider.PASSWORD,
            passwordHash,
            isEnabled: true,
          },
        });
      }

      await prisma.patientProfile.upsert({
        where: { userId },
        create: {
          id: profileId,
          userId,
          countryId,
          displayName: `${pick(NAMES, i)} (مريض ${i})`,
          gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
          dateOfBirth: new Date(1989 + (i % 12), i % 12, (i % 27) + 1),
          onboardingCompletedAt: i % 4 === 0 ? null : daysAgo(i % 120),
        },
        update: {
          countryId,
          displayName: `${pick(NAMES, i)} (مريض ${i})`,
          gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
          dateOfBirth: new Date(1989 + (i % 12), i % 12, (i % 27) + 1),
          onboardingCompletedAt: i % 4 === 0 ? null : daysAgo(i % 120),
        },
      });

      patientUsers.push({ userId, profileId });
    }

    for (let i = 1; i <= cfg.practitioners; i += 1) {
      const userId = uuid(`bulk-practitioner-user-${i}`);
      const profileId = uuid(`bulk-practitioner-profile-${i}`);
      const email = `practitioner.bulk.${i}@hesba.local`;
      const phone = `+9665${String(1000000 + i).slice(-7)}`;
      const countryId = pick(countries, i + 1).id;
      const primarySpecialty = pick(specialties, i).id;
      const secondarySpecialty = pick(specialties, i + 1).id;

      await prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          displayName: `د. ${pick(NAMES, i)} ${i}`,
          status: UserStatus.ACTIVE,
          defaultLocale: i % 2 === 0 ? 'ar' : 'en',
          timezone: pick(TIMEZONES, i + 1),
        },
        update: {
          displayName: `د. ${pick(NAMES, i)} ${i}`,
          status: UserStatus.ACTIVE,
          defaultLocale: i % 2 === 0 ? 'ar' : 'en',
          timezone: pick(TIMEZONES, i + 1),
        },
      });

      await prisma.userRole.upsert({
        where: { userId_role: { userId, role: UserRoleType.PRACTITIONER } },
        create: { userId, role: UserRoleType.PRACTITIONER },
        update: {},
      });

      await prisma.userEmail.upsert({
        where: { email },
        create: {
          id: uuid(`bulk-practitioner-email-${i}`),
          userId,
          email,
          isPrimary: true,
          isVerified: true,
        },
        update: {
          userId,
          isPrimary: true,
          isVerified: true,
        },
      });

      await prisma.userEmail.deleteMany({
        where: {
          userId,
          email: {
            not: email,
          },
        },
      });

      await prisma.userPhone.upsert({
        where: { phone },
        create: {
          id: uuid(`bulk-practitioner-phone-${i}`),
          userId,
          phone,
          isPrimary: true,
          isVerified: true,
        },
        update: {
          userId,
          isPrimary: true,
          isVerified: true,
        },
      });

      const existingPassword = await prisma.authIdentity.findFirst({
        where: { userId, provider: AuthProvider.PASSWORD },
      });
      if (existingPassword) {
        await prisma.authIdentity.update({
          where: { id: existingPassword.id },
          data: { passwordHash, isEnabled: true },
        });
      } else {
        await prisma.authIdentity.create({
          data: {
            id: uuid(`bulk-practitioner-auth-${i}`),
            userId,
            provider: AuthProvider.PASSWORD,
            passwordHash,
            isEnabled: true,
          },
        });
      }

      await prisma.practitionerProfile.upsert({
        where: { userId },
        create: {
          id: profileId,
          userId,
          countryId,
          practitionerType: pick(
            [
              PractitionerType.PSYCHOLOGIST,
              PractitionerType.PSYCHIATRIST,
              PractitionerType.COUNSELOR,
              PractitionerType.NUTRITIONIST,
            ],
            i,
          ),
          practitionerGender:
            i % 2 === 0 ? PractitionerGender.MALE : PractitionerGender.FEMALE,
          publicSlug: `bulk-practitioner-${i}`,
          professionalTitle: 'أخصائي صحة نفسية وتطوير نمط حياة',
          bio: `ممارس رقم ${i} يخدم الحالات داخل مصر والوطن العربي.`,
          yearsOfExperience: 3 + (i % 18),
          sessionPrice30: money(350, 120, i),
          sessionPrice60: money(650, 180, i),
          status: PractitionerStatus.APPROVED,
          isPublicProfilePublished: true,
        },
        update: {
          countryId,
          practitionerType: pick(
            [
              PractitionerType.PSYCHOLOGIST,
              PractitionerType.PSYCHIATRIST,
              PractitionerType.COUNSELOR,
              PractitionerType.NUTRITIONIST,
            ],
            i,
          ),
          practitionerGender:
            i % 2 === 0 ? PractitionerGender.MALE : PractitionerGender.FEMALE,
          publicSlug: `bulk-practitioner-${i}`,
          professionalTitle: 'أخصائي صحة نفسية وتطوير نمط حياة',
          bio: `ممارس رقم ${i} يخدم الحالات داخل مصر والوطن العربي.`,
          yearsOfExperience: 3 + (i % 18),
          sessionPrice30: money(350, 120, i),
          sessionPrice60: money(650, 180, i),
          status: PractitionerStatus.APPROVED,
          isPublicProfilePublished: true,
        },
      });

      await prisma.practitionerProfileLanguage.upsert({
        where: {
          practitionerId_languageId: {
            practitionerId: profileId,
            languageId: arLanguageId,
          },
        },
        create: {
          practitionerId: profileId,
          languageId: arLanguageId,
          isPrimary: true,
        },
        update: { isPrimary: true },
      });

      await prisma.practitionerProfileLanguage.upsert({
        where: {
          practitionerId_languageId: {
            practitionerId: profileId,
            languageId: enLanguageId,
          },
        },
        create: {
          practitionerId: profileId,
          languageId: enLanguageId,
          isPrimary: false,
        },
        update: { isPrimary: false },
      });

      await prisma.practitionerSpecialty.upsert({
        where: {
          practitionerId_specialtyId: {
            practitionerId: profileId,
            specialtyId: primarySpecialty,
          },
        },
        create: {
          practitionerId: profileId,
          specialtyId: primarySpecialty,
          isPrimary: true,
        },
        update: { isPrimary: true },
      });

      await prisma.practitionerSpecialty.upsert({
        where: {
          practitionerId_specialtyId: {
            practitionerId: profileId,
            specialtyId: secondarySpecialty,
          },
        },
        create: {
          practitionerId: profileId,
          specialtyId: secondarySpecialty,
          isPrimary: false,
        },
        update: { isPrimary: false },
      });

      const practitionerTimezone = pick(TIMEZONES, i);
      const baseDate = new Date();
      for (const weekOffset of [0, 1]) {
        const range = getSundayBasedWeekRange(baseDate, weekOffset);
        const weekId = uuid(
          `bulk-practitioner-availability-week-${profileId}-${range.weekStartDate.toISOString().slice(0, 10)}`,
        );

        await prisma.practitionerAvailabilityWeek.upsert({
          where: { id: weekId },
          create: {
            id: weekId,
            practitionerId: profileId,
            weekStartDate: range.weekStartDate,
            weekEndDate: range.weekEndDate,
            timezone: practitionerTimezone,
            status: AvailabilityWeekStatus.PUBLISHED,
            publishedAt: range.weekStartDate,
            archivedAt: null,
            slots: {
              create: BULK_AVAILABILITY_WEEKDAYS.map((weekday) => ({
                id: uuid(
                  `bulk-practitioner-availability-slot-${weekId}-${weekday}`,
                ),
                weekday,
                durationMinutes: 30,
                startMinuteOfDay: 10 * 60 + (i % 3) * 60,
                endMinuteOfDay: 18 * 60 + (i % 2) * 30,
                timezone: practitionerTimezone,
              })),
            },
          },
          update: {
            practitionerId: profileId,
            weekStartDate: range.weekStartDate,
            weekEndDate: range.weekEndDate,
            timezone: practitionerTimezone,
            status: AvailabilityWeekStatus.PUBLISHED,
            publishedAt: range.weekStartDate,
            archivedAt: null,
            slots: {
              deleteMany: {},
              create: BULK_AVAILABILITY_WEEKDAYS.map((weekday) => ({
                id: uuid(
                  `bulk-practitioner-availability-slot-${weekId}-${weekday}`,
                ),
                weekday,
                durationMinutes: 30,
                startMinuteOfDay: 10 * 60 + (i % 3) * 60,
                endMinuteOfDay: 18 * 60 + (i % 2) * 30,
                timezone: practitionerTimezone,
              })),
            },
          },
        });
      }

      practitionerUsers.push({ userId, profileId });
    }

    const sessions: Array<{
      id: string;
      patientId: string;
      practitionerId: string;
      status: SessionStatus;
      endAt: Date;
    }> = [];
    const financeMap = new Map<
      string,
      { pending: number; available: number; earned: number }
    >();

    for (let i = 1; i <= cfg.sessions; i += 1) {
      const sessionId = uuid(`bulk-session-${i}`);
      const patient = pick(patientUsers, i);
      const practitioner = pick(practitionerUsers, i + 7);
      const startAt = hoursAgo((i % 24) + 5);
      const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
      const status = pick(
        [
          SessionStatus.COMPLETED,
          SessionStatus.CONFIRMED,
          SessionStatus.CANCELLED,
          SessionStatus.UPCOMING,
          SessionStatus.READY_TO_JOIN,
          SessionStatus.IN_PROGRESS,
        ],
        i,
      );

      const seededSessionCode = `SES-${startAt.getUTCFullYear()}-${String(500000 + i).padStart(6, '0')}`;

      await prisma.session.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          sessionCode: seededSessionCode,
          patientId: patient.profileId,
          practitionerId: practitioner.profileId,
          flowType:
            i % 4 === 0 ? SessionFlowType.INSTANT : SessionFlowType.SCHEDULED,
          sessionMode: pick(
            [SessionMode.VIDEO, SessionMode.CHAT, SessionMode.AUDIO],
            i,
          ),
          durationMinutes: 60,
          status,
          requestedStartAt: startAt,
          scheduledStartAt: startAt,
          scheduledEndAt: endAt,
          joinOpenAt: new Date(startAt.getTime() - 10 * 60 * 1000),
          completedAt: status === SessionStatus.COMPLETED ? endAt : null,
          cancelledAt: status === SessionStatus.CANCELLED ? endAt : null,
          timezoneSnapshot: pick(TIMEZONES, i),
          provider: SessionProvider.DAILY,
          providerRoomId: `bulk-room-${i}`,
          providerSessionRef: `bulk-provider-session-${i}`,
        },
        update: {
          sessionCode: seededSessionCode,
          patientId: patient.profileId,
          practitionerId: practitioner.profileId,
          status,
          scheduledStartAt: startAt,
          scheduledEndAt: endAt,
          completedAt: status === SessionStatus.COMPLETED ? endAt : null,
          cancelledAt: status === SessionStatus.CANCELLED ? endAt : null,
          timezoneSnapshot: pick(TIMEZONES, i),
        },
      });

      const paymentId = uuid(`bulk-payment-${i}`);
      const subtotal = Number(money(700, 200, i));
      const discount = i % 5 === 0 ? 50 : 0;
      const total = subtotal - discount;
      const paymentStatus =
        status === SessionStatus.CANCELLED
          ? PaymentStatus.FAILED
          : status === SessionStatus.COMPLETED ||
              status === SessionStatus.IN_PROGRESS
            ? PaymentStatus.CAPTURED
            : PaymentStatus.PENDING;

      await prisma.payment.upsert({
        where: { id: paymentId },
        create: {
          id: paymentId,
          sessionId,
          patientId: patient.profileId,
          practitionerId: practitioner.profileId,
          paymentPurpose: PaymentPurpose.SESSION_BOOKING,
          provider: pick([PaymentProvider.PAYMOB, PaymentProvider.STRIPE], i),
          status: paymentStatus,
          amountSubtotal: subtotal.toFixed(2),
          amountDiscount: discount.toFixed(2),
          amountTotal: total.toFixed(2),
          currencyCode: 'EGP',
          providerPaymentRef: `bulk-payment-ref-${i}`,
          providerOrderRef: `bulk-order-ref-${i}`,
          initiatedAt: startAt,
          capturedAt: paymentStatus === PaymentStatus.CAPTURED ? startAt : null,
          failedAt: paymentStatus === PaymentStatus.FAILED ? startAt : null,
        },
        update: {
          status: paymentStatus,
          amountSubtotal: subtotal.toFixed(2),
          amountDiscount: discount.toFixed(2),
          amountTotal: total.toFixed(2),
          capturedAt: paymentStatus === PaymentStatus.CAPTURED ? startAt : null,
          failedAt: paymentStatus === PaymentStatus.FAILED ? startAt : null,
        },
      });

      await prisma.paymentEvent.upsert({
        where: { id: uuid(`bulk-payment-event-${i}`) },
        create: {
          id: uuid(`bulk-payment-event-${i}`),
          paymentId,
          eventType:
            paymentStatus === PaymentStatus.CAPTURED
              ? 'PAYMENT_CAPTURED'
              : paymentStatus === PaymentStatus.FAILED
                ? 'PAYMENT_FAILED'
                : 'PAYMENT_CREATED',
          providerEventRef: `bulk-provider-event-${i}`,
        },
        update: {},
      });

      const earnings = Math.max(100, Math.round(total * 0.75));
      const finance = financeMap.get(practitioner.profileId) ?? {
        pending: 0,
        available: 0,
        earned: 0,
      };
      if (paymentStatus === PaymentStatus.CAPTURED) {
        finance.pending += earnings;
        finance.earned += earnings;
      }

      await prisma.ledgerEntry.upsert({
        where: { id: uuid(`bulk-ledger-${i}`) },
        create: {
          id: uuid(`bulk-ledger-${i}`),
          practitionerId: practitioner.profileId,
          sessionId,
          paymentId,
          entryType:
            paymentStatus === PaymentStatus.CAPTURED
              ? LedgerEntryType.PRACTITIONER_EARNING
              : LedgerEntryType.MANUAL_ADJUSTMENT,
          direction:
            paymentStatus === PaymentStatus.CAPTURED
              ? LedgerDirection.CREDIT
              : LedgerDirection.DEBIT,
          amount: (paymentStatus === PaymentStatus.CAPTURED
            ? earnings
            : 0
          ).toFixed(2),
          currencyCode: 'EGP',
          balanceBucket: WalletBalanceBucket.PENDING,
          referenceType: 'PAYMENT',
          referenceId: paymentId,
          description: 'Bulk finance seed entry',
          effectiveAt: startAt,
        },
        update: {
          amount: (paymentStatus === PaymentStatus.CAPTURED
            ? earnings
            : 0
          ).toFixed(2),
          effectiveAt: startAt,
        },
      });

      if (i % 9 === 0 && paymentStatus === PaymentStatus.CAPTURED) {
        const refundAmount = Math.round(total * 0.2);
        await prisma.refund.upsert({
          where: { id: uuid(`bulk-refund-${i}`) },
          create: {
            id: uuid(`bulk-refund-${i}`),
            paymentId,
            sessionId,
            refundType: RefundType.PARTIAL,
            status: pick(
              [
                RefundStatus.REQUESTED,
                RefundStatus.PROCESSING,
                RefundStatus.SUCCEEDED,
              ],
              i,
            ),
            refundReason: 'Regional bulk refund scenario',
            amount: refundAmount.toFixed(2),
            currencyCode: 'EGP',
            providerRefundRef: `bulk-refund-ref-${i}`,
            requestedAt: endAt,
            processedAt: i % 3 === 0 ? daysAgo(0) : null,
          },
          update: {},
        });
        finance.pending = Math.max(0, finance.pending - refundAmount);
      }

      financeMap.set(practitioner.profileId, finance);
      sessions.push({
        id: sessionId,
        patientId: patient.profileId,
        practitionerId: practitioner.profileId,
        status,
        endAt,
      });
    }

    const walletIds = new Map<string, string>();
    for (const practitioner of practitionerUsers) {
      const finance = financeMap.get(practitioner.profileId) ?? {
        pending: 0,
        available: 0,
        earned: 0,
      };
      finance.available = Math.round(finance.pending * 0.6);
      finance.pending = Math.max(0, finance.pending - finance.available);
      const walletWhere = {
        practitionerId_currencyCode: {
          practitionerId: practitioner.profileId,
          currencyCode: 'EGP',
        },
      } as const;
      const existingWallet = await prisma.practitionerWallet.findUnique({
        where: walletWhere,
        select: { id: true },
      });
      const wallet = existingWallet
        ? await prisma.practitionerWallet.update({
            where: walletWhere,
            data: {
              availableBalance: finance.available.toFixed(2),
              pendingBalance: finance.pending.toFixed(2),
              lifetimeEarned: finance.earned.toFixed(2),
              lifetimePaidOut: Math.round(finance.available * 0.4).toFixed(2),
              lastLedgerEntryAt: new Date(),
            },
          })
        : await prisma.practitionerWallet.create({
            data: {
              id: uuid(`regional-bulk-wallet-${practitioner.profileId}-EGP`),
              practitionerId: practitioner.profileId,
              currencyCode: 'EGP',
              availableBalance: finance.available.toFixed(2),
              pendingBalance: finance.pending.toFixed(2),
              reservedBalance: '0.00',
              lifetimeEarned: finance.earned.toFixed(2),
              lifetimePaidOut: Math.round(finance.available * 0.4).toFixed(2),
              lastLedgerEntryAt: new Date(),
            },
          });
      walletIds.set(practitioner.profileId, wallet.id);
    }

    for (let monthOffset = 0; monthOffset < 6; monthOffset += 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - monthOffset);
      const periodYear = date.getFullYear();
      const periodMonth = date.getMonth() + 1;
      const batchWhere = {
        periodYear_periodMonth_currencyCode: {
          periodYear,
          periodMonth,
          currencyCode: 'EGP',
        },
      } as const;
      const existingBatch = await prisma.settlementBatch.findUnique({
        where: batchWhere,
        select: { id: true },
      });
      const batch = existingBatch
        ? await prisma.settlementBatch.update({
            where: batchWhere,
            data: {
              status:
                monthOffset === 0
                  ? SettlementBatchStatus.PROCESSING
                  : SettlementBatchStatus.COMPLETED,
              generatedAt: daysAgo(monthOffset * 30 + 2),
              finalizedAt: monthOffset === 0 ? null : daysAgo(monthOffset * 30),
              slug: `bulk-egp-${periodYear}-${periodMonth}`,
            },
          })
        : await prisma.settlementBatch.create({
            data: {
              id: buildSettlementBatchSeedId(periodYear, periodMonth, 'EGP'),
              periodYear,
              periodMonth,
              currencyCode: 'EGP',
              status:
                monthOffset === 0
                  ? SettlementBatchStatus.PROCESSING
                  : SettlementBatchStatus.COMPLETED,
              slug: `bulk-egp-${periodYear}-${periodMonth}`,
              generatedAt: daysAgo(monthOffset * 30 + 2),
              finalizedAt: monthOffset === 0 ? null : daysAgo(monthOffset * 30),
            },
          });
      const batchId = batch.id;

      for (let i = 0; i < practitionerUsers.length; i += 1) {
        if ((i + monthOffset) % 3 !== 0) {
          continue;
        }
        const practitioner = practitionerUsers[i];
        const gross = Number(money(1200, 280, i + monthOffset));
        const adj = i % 7 === 0 ? -50 : 0;
        const net = gross + adj;
        const settlementWhere = {
          batchId_practitionerId: {
            batchId,
            practitionerId: practitioner.profileId,
          },
        } as const;
        const existingSettlement =
          await prisma.practitionerSettlement.findUnique({
            where: settlementWhere,
            select: { id: true },
          });
        if (existingSettlement) {
          await prisma.practitionerSettlement.update({
            where: settlementWhere,
            data: {
              amountGross: gross.toFixed(2),
              amountAdjustments: adj.toFixed(2),
              amountNet: net.toFixed(2),
              walletId: walletIds.get(practitioner.profileId) ?? null,
              currencyCode: 'EGP',
              status:
                monthOffset === 0
                  ? PractitionerSettlementStatus.PROCESSING
                  : PractitionerSettlementStatus.PAID,
              paidAt: monthOffset === 0 ? null : daysAgo(monthOffset * 30 - 1),
            },
          });
        } else {
          await prisma.practitionerSettlement.create({
            data: {
              id: uuid(
                `regional-bulk-practitioner-settlement-${batchId}-${practitioner.profileId}`,
              ),
              batchId,
              practitionerId: practitioner.profileId,
              walletId: walletIds.get(practitioner.profileId) ?? null,
              amountGross: gross.toFixed(2),
              amountAdjustments: adj.toFixed(2),
              amountNet: net.toFixed(2),
              currencyCode: 'EGP',
              status:
                monthOffset === 0
                  ? PractitionerSettlementStatus.PROCESSING
                  : PractitionerSettlementStatus.PAID,
              paidAt: monthOffset === 0 ? null : daysAgo(monthOffset * 30 - 1),
            },
          });
        }
      }
    }

    const completedSessions = sessions.filter(
      (s) => s.status === SessionStatus.COMPLETED,
    );
    for (let i = 0; i < completedSessions.length; i += 1) {
      const session = completedSessions[i];
      const reviewStatus =
        i % 13 === 0
          ? SessionReviewStatus.HIDDEN
          : i % 17 === 0
            ? SessionReviewStatus.REJECTED
            : SessionReviewStatus.PUBLISHED;

      await prisma.sessionReview.upsert({
        where: { sessionId: session.id },
        create: {
          id: uuid(`bulk-review-${session.id}`),
          sessionId: session.id,
          patientId: session.patientId,
          practitionerId: session.practitionerId,
          ratingValue: (i % 5) + 1,
          reviewTitle: `تقييم جلسة ${i + 1}`,
          reviewText: `تقييم واقعي للجلسة ${i + 1} لاختبار النظام.`,
          reviewStatus,
          submittedAt: session.endAt,
          publishedAt:
            reviewStatus === SessionReviewStatus.PUBLISHED
              ? session.endAt
              : null,
          hiddenAt:
            reviewStatus === SessionReviewStatus.HIDDEN ? session.endAt : null,
          isAnonymous: i % 4 === 0,
        },
        update: {
          ratingValue: (i % 5) + 1,
          reviewStatus,
          submittedAt: session.endAt,
          publishedAt:
            reviewStatus === SessionReviewStatus.PUBLISHED
              ? session.endAt
              : null,
          hiddenAt:
            reviewStatus === SessionReviewStatus.HIDDEN ? session.endAt : null,
        },
      });
    }

    for (const slug of [
      'mental-health',
      'relationships',
      'nutrition',
      'sleep',
    ]) {
      const categoryId = uuid(`bulk-article-category-${slug}`);
      await prisma.articleCategory.upsert({
        where: { slugRoot: slug },
        create: { id: categoryId, slugRoot: slug, isActive: true },
        update: { isActive: true },
      });
      await prisma.articleCategoryTranslation.upsert({
        where: {
          articleCategoryId_locale: {
            articleCategoryId: categoryId,
            locale: ContentLocale.ar,
          },
        },
        create: {
          articleCategoryId: categoryId,
          locale: ContentLocale.ar,
          title: `تصنيف ${slug}`,
          slug: `${slug}-ar`,
        },
        update: {},
      });
      await prisma.articleCategoryTranslation.upsert({
        where: {
          articleCategoryId_locale: {
            articleCategoryId: categoryId,
            locale: ContentLocale.en,
          },
        },
        create: {
          articleCategoryId: categoryId,
          locale: ContentLocale.en,
          title: slug,
          slug: `${slug}-en`,
        },
        update: {},
      });
    }

    const articleCategoryIds = (
      await prisma.articleCategory.findMany({
        where: {
          slugRoot: {
            in: ['mental-health', 'relationships', 'nutrition', 'sleep'],
          },
        },
        select: { id: true },
      })
    ).map((c) => c.id);

    for (let i = 1; i <= cfg.articles; i += 1) {
      const articleId = uuid(`bulk-article-${i}`);
      const practitioner = pick(practitionerUsers, i);
      const categoryId = pick(articleCategoryIds, i);
      const status =
        i % 8 === 0 ? ArticleStatus.DRAFT : ArticleStatus.PUBLISHED;
      const visibility =
        i % 9 === 0 ? ArticleVisibility.UNLISTED : ArticleVisibility.PUBLIC;
      const publishedAt =
        status === ArticleStatus.PUBLISHED ? daysAgo(i % 200) : null;

      await prisma.article.upsert({
        where: { id: articleId },
        create: {
          id: articleId,
          authorUserId: practitioner.userId,
          authorPractitionerId: practitioner.profileId,
          primaryCategoryId: categoryId,
          status,
          visibility,
          publishedAt,
          approvedAt: publishedAt,
        },
        update: {
          authorUserId: practitioner.userId,
          authorPractitionerId: practitioner.profileId,
          primaryCategoryId: categoryId,
          status,
          visibility,
          publishedAt,
          approvedAt: publishedAt,
        },
      });

      await prisma.articleTranslation.upsert({
        where: { articleId_locale: { articleId, locale: ContentLocale.ar } },
        create: {
          articleId,
          locale: ContentLocale.ar,
          title: `مقالة رقم ${i}`,
          excerpt: `ملخص المقالة ${i}`,
          contentMarkdown: `## المقالة ${i}\n\nمحتوى تجريبي عربي.`,
          slug: `bulk-article-${i}-ar`,
          readingTimeMinutes: 3 + (i % 8),
        },
        update: {
          title: `مقالة رقم ${i}`,
          excerpt: `ملخص المقالة ${i}`,
        },
      });

      await prisma.articleTranslation.upsert({
        where: { articleId_locale: { articleId, locale: ContentLocale.en } },
        create: {
          articleId,
          locale: ContentLocale.en,
          title: `Article ${i}`,
          excerpt: `Article excerpt ${i}`,
          contentMarkdown: `## Article ${i}\n\nEnglish test content.`,
          slug: `bulk-article-${i}-en`,
          readingTimeMinutes: 3 + (i % 8),
        },
        update: {
          title: `Article ${i}`,
          excerpt: `Article excerpt ${i}`,
        },
      });

      await prisma.articleCategoryAssignment.upsert({
        where: {
          articleId_articleCategoryId: {
            articleId,
            articleCategoryId: categoryId,
          },
        },
        create: {
          articleId,
          articleCategoryId: categoryId,
          isPrimary: true,
        },
        update: { isPrimary: true },
      });
    }

    const supportUser = await prisma.user.findFirst({
      where: { roles: { some: { role: UserRoleType.SUPPORT } } },
      select: { id: true },
    });
    const supportUserId = supportUser?.id ?? patientUsers[0].userId;

    for (let i = 1; i <= cfg.conversations; i += 1) {
      const conversationId = uuid(`bulk-conversation-${i}`);
      const patient = pick(patientUsers, i);
      const practitioner = pick(practitionerUsers, i + 9);
      const supportConv = i % 3 === 0;

      await prisma.conversation.upsert({
        where: { id: conversationId },
        create: {
          id: conversationId,
          conversationType: supportConv
            ? ConversationType.SUPPORT
            : ConversationType.CARE_APPROVED,
          status:
            i % 10 === 0 ? ConversationStatus.CLOSED : ConversationStatus.OPEN,
          patientId: patient.profileId,
          practitionerId: practitioner.profileId,
          sessionId: pick(sessions, i).id,
          conversationRef: `bulk-conv-${i}`,
          startedAt: daysAgo(i % 120),
        },
        update: {
          status:
            i % 10 === 0 ? ConversationStatus.CLOSED : ConversationStatus.OPEN,
          patientId: patient.profileId,
          practitionerId: practitioner.profileId,
          sessionId: pick(sessions, i).id,
        },
      });

      await prisma.conversationParticipant.upsert({
        where: { id: uuid(`bulk-conversation-participant-p-${i}`) },
        create: {
          id: uuid(`bulk-conversation-participant-p-${i}`),
          conversationId,
          userId: patient.userId,
          participantRole: ConversationParticipantRole.PATIENT,
          isActive: true,
        },
        update: {
          conversationId,
          userId: patient.userId,
          participantRole: ConversationParticipantRole.PATIENT,
          isActive: true,
        },
      });

      await prisma.conversationParticipant.upsert({
        where: { id: uuid(`bulk-conversation-participant-r-${i}`) },
        create: {
          id: uuid(`bulk-conversation-participant-r-${i}`),
          conversationId,
          userId: practitioner.userId,
          participantRole: ConversationParticipantRole.PRACTITIONER,
          isActive: true,
        },
        update: {
          conversationId,
          userId: practitioner.userId,
          participantRole: ConversationParticipantRole.PRACTITIONER,
          isActive: true,
        },
      });

      if (supportConv) {
        await prisma.conversationParticipant.upsert({
          where: { id: uuid(`bulk-conversation-participant-s-${i}`) },
          create: {
            id: uuid(`bulk-conversation-participant-s-${i}`),
            conversationId,
            userId: supportUserId,
            participantRole: ConversationParticipantRole.SUPPORT_AGENT,
            isActive: true,
          },
          update: {
            conversationId,
            userId: supportUserId,
            participantRole: ConversationParticipantRole.SUPPORT_AGENT,
            isActive: true,
          },
        });
      }

      let latestMessageAt: Date | null = null;
      for (let m = 1; m <= cfg.messagesPerConversation; m += 1) {
        const sentAt = hoursAgo(i + m);
        latestMessageAt = sentAt;
        await prisma.message.upsert({
          where: { id: uuid(`bulk-message-${i}-${m}`) },
          create: {
            id: uuid(`bulk-message-${i}-${m}`),
            conversationId,
            senderUserId: m % 2 === 0 ? patient.userId : practitioner.userId,
            messageType: MessageType.TEXT,
            status: MessageStatus.SENT,
            visibility: MessageVisibility.NORMAL,
            contentText: `رسالة ${m} في محادثة ${i}`,
            sentAt,
          },
          update: {
            senderUserId: m % 2 === 0 ? patient.userId : practitioner.userId,
            contentText: `رسالة ${m} في محادثة ${i}`,
            sentAt,
          },
        });
      }

      if (supportConv) {
        const ticketId = uuid(`bulk-support-ticket-${i}`);
        await prisma.supportTicket.upsert({
          where: { conversationId },
          create: {
            id: ticketId,
            openedByUserId: patient.userId,
            createdByRole: ConversationParticipantRole.PATIENT,
            patientId: patient.profileId,
            practitionerId: practitioner.profileId,
            conversationId,
            ticketType: pick(
              [
                SupportTicketType.BOOKING,
                SupportTicketType.PAYMENT,
                SupportTicketType.TECHNICAL,
                SupportTicketType.GENERAL,
              ],
              i,
            ),
            status: pick(
              [
                SupportTicketStatus.OPEN,
                SupportTicketStatus.IN_PROGRESS,
                SupportTicketStatus.RESOLVED,
              ],
              i,
            ),
            priority: pick(
              [
                SupportTicketPriority.NORMAL,
                SupportTicketPriority.MEDIUM,
                SupportTicketPriority.HIGH,
              ],
              i,
            ),
            subject: `Support ticket ${i}`,
            description: `Seed support scenario ${i}`,
            assignedToUserId: supportUserId,
            publicTicketRef: `SUP-${String(10000 + i)}`,
            relatedSessionId: pick(sessions, i).id,
            lastMessageAt: latestMessageAt,
          },
          update: {
            status: pick(
              [
                SupportTicketStatus.OPEN,
                SupportTicketStatus.IN_PROGRESS,
                SupportTicketStatus.RESOLVED,
              ],
              i,
            ),
            priority: pick(
              [
                SupportTicketPriority.NORMAL,
                SupportTicketPriority.MEDIUM,
                SupportTicketPriority.HIGH,
              ],
              i,
            ),
            assignedToUserId: supportUserId,
            relatedSessionId: pick(sessions, i).id,
            lastMessageAt: latestMessageAt,
          },
        });

        await prisma.supportTicketEvent.upsert({
          where: { id: uuid(`bulk-support-ticket-event-${i}`) },
          create: {
            id: uuid(`bulk-support-ticket-event-${i}`),
            supportTicketId: ticketId,
            eventType: SupportTicketEventType.TICKET_CREATED,
            actorUserId: patient.userId,
            actorRole: ConversationParticipantRole.PATIENT,
          },
          update: {},
        });
      }
    }

    for (let i = 1; i <= Math.min(cfg.conversations, 240); i += 1) {
      const reportId = uuid(`bulk-moderation-report-${i}`);
      await prisma.moderationReport.upsert({
        where: { id: reportId },
        create: {
          id: reportId,
          targetType: pick(
            [
              ModerationReportTargetType.SUPPORT_TICKET,
              ModerationReportTargetType.SUPPORT_MESSAGE,
              ModerationReportTargetType.CARE_CHAT_MESSAGE,
              ModerationReportTargetType.REVIEW,
              ModerationReportTargetType.ARTICLE,
            ],
            i,
          ),
          targetId: uuid(`bulk-target-${i}`),
          reason: pick(
            [
              ModerationReportReason.SPAM,
              ModerationReportReason.HARASSMENT,
              ModerationReportReason.INAPPROPRIATE_CONTENT,
              ModerationReportReason.OTHER,
            ],
            i,
          ),
          status: pick(
            [
              ModerationCaseStatus.OPEN,
              ModerationCaseStatus.UNDER_REVIEW,
              ModerationCaseStatus.RESOLVED,
            ],
            i,
          ),
          reportedByUserId: pick(patientUsers, i).userId,
          reportedByRole: ModerationReporterRole.PATIENT,
          note: `Seed moderation report ${i}`,
        },
        update: {
          status: pick(
            [
              ModerationCaseStatus.OPEN,
              ModerationCaseStatus.UNDER_REVIEW,
              ModerationCaseStatus.RESOLVED,
            ],
            i,
          ),
        },
      });

      await prisma.moderationReportAuditEvent.upsert({
        where: { id: uuid(`bulk-moderation-audit-${i}`) },
        create: {
          id: uuid(`bulk-moderation-audit-${i}`),
          moderationReportId: reportId,
          eventType: ModerationAuditEventType.REPORT_CREATED,
          actorUserId: pick(patientUsers, i).userId,
          actorRole: ModerationReporterRole.PATIENT,
        },
        update: {},
      });

      if (i % 4 === 0) {
        await prisma.moderationReportAction.upsert({
          where: { id: uuid(`bulk-moderation-action-${i}`) },
          create: {
            id: uuid(`bulk-moderation-action-${i}`),
            moderationReportId: reportId,
            actionType: ModerationCaseActionType.REVIEW_CASE,
            previousStatus: ModerationCaseStatus.OPEN,
            nextStatus: ModerationCaseStatus.UNDER_REVIEW,
            actedByUserId: supportUserId,
            actedByRole: ModerationReporterRole.SUPPORT_AGENT,
          },
          update: {},
        });
      }
    }

    const notificationTypes = await prisma.notificationType.findMany({
      select: {
        id: true,
        supportsInApp: true,
        supportsEmail: true,
        supportsSms: true,
      },
      take: 12,
    });
    const usersForNotifications = [...patientUsers, ...practitionerUsers];
    for (let i = 0; i < usersForNotifications.length; i += 1) {
      const user = usersForNotifications[i];
      for (let n = 1; n <= cfg.notificationsPerUser; n += 1) {
        const type = pick(notificationTypes, i + n);
        const channel = type.supportsInApp
          ? NotificationChannel.IN_APP
          : type.supportsEmail
            ? NotificationChannel.EMAIL
            : type.supportsSms
              ? NotificationChannel.SMS
              : NotificationChannel.IN_APP;

        await prisma.notification.upsert({
          where: { id: uuid(`bulk-notification-${user.userId}-${n}`) },
          create: {
            id: uuid(`bulk-notification-${user.userId}-${n}`),
            userId: user.userId,
            notificationTypeId: type.id,
            channel,
            status: pick(
              [
                NotificationStatus.SENT,
                NotificationStatus.DELIVERED,
                NotificationStatus.READ,
                NotificationStatus.FAILED,
              ],
              n,
            ),
            locale: i % 2 === 0 ? 'ar' : 'en',
            titleSnapshot: `Notification ${n}`,
            bodySnapshot: `Seed notification ${n} for pagination`,
            payloadJson: { seed: true, index: n },
            sentAt: daysAgo(n % 40),
            createdAt: daysAgo(n % 40),
          },
          update: {
            status: pick(
              [
                NotificationStatus.SENT,
                NotificationStatus.DELIVERED,
                NotificationStatus.READ,
                NotificationStatus.FAILED,
              ],
              n,
            ),
            titleSnapshot: `Notification ${n}`,
            bodySnapshot: `Seed notification ${n} for pagination`,
          },
        });
      }
    }

    const definitions = await prisma.assessmentDefinition.findMany({
      where: { isPublished: true },
      include: {
        questions: { include: { options: true }, orderBy: { order: 'asc' } },
      },
    });
    for (let i = 1; i <= Math.min(patientUsers.length, 120); i += 1) {
      const patient = pick(patientUsers, i);
      const definition = pick(definitions, i);
      if (!definition || definition.questions.length === 0) {
        continue;
      }
      const submissionId = uuid(`bulk-assessment-submission-${i}`);
      await prisma.assessmentSubmission.upsert({
        where: { id: submissionId },
        create: {
          id: submissionId,
          assessmentDefinitionId: definition.id,
          patientProfileId: patient.profileId,
          status: AssessmentSubmissionStatus.COMPLETED,
          startedAt: daysAgo(i % 30),
          completedAt: daysAgo(i % 30),
          totalScore: 8,
          resultBand: AssessmentResultBand.MODERATE,
          resultSummary: 'Seed assessment summary',
          definitionVersionSnapshot: definition.version,
          definitionSlugSnapshot: definition.slug,
          definitionTitleSnapshot: definition.title,
        },
        update: {
          status: AssessmentSubmissionStatus.COMPLETED,
          completedAt: daysAgo(i % 30),
        },
      });
    }

    for (let i = 1; i <= Math.min(patientUsers.length, 120); i += 1) {
      const matchingId = uuid(`bulk-matching-${i}`);
      await prisma.matchingSession.upsert({
        where: { id: matchingId },
        create: {
          id: matchingId,
          patientProfileId: pick(patientUsers, i).profileId,
          status: MatchingSessionStatus.COMPLETED,
          startedAt: daysAgo(i % 40),
          completedAt: daysAgo(i % 40),
        },
        update: {
          status: MatchingSessionStatus.COMPLETED,
          completedAt: daysAgo(i % 40),
        },
      });

      await prisma.matchingAnswer.upsert({
        where: {
          matchingSessionId_key: {
            matchingSessionId: matchingId,
            key: MatchingAnswerKey.PRIMARY_CONCERN,
          },
        },
        create: {
          id: uuid(`bulk-matching-answer-${i}`),
          matchingSessionId: matchingId,
          key: MatchingAnswerKey.PRIMARY_CONCERN,
          valueJson: { value: 'anxiety' },
        },
        update: {
          valueJson: { value: 'anxiety' },
        },
      });
    }

    for (let i = 1; i <= cfg.courses; i += 1) {
      const categoryId = uuid(`bulk-course-category-${(i % 5) + 1}`);
      await prisma.courseCategory.upsert({
        where: { slugRoot: `bulk-course-category-${(i % 5) + 1}` },
        create: {
          id: categoryId,
          slugRoot: `bulk-course-category-${(i % 5) + 1}`,
          isActive: true,
        },
        update: { isActive: true },
      });

      const courseId = uuid(`bulk-course-${i}`);
      await prisma.course.upsert({
        where: { slugRoot: `bulk-course-${i}` },
        create: {
          id: courseId,
          primaryCategoryId: categoryId,
          slugRoot: `bulk-course-${i}`,
          courseType: CourseType.LIVE_COURSE,
          deliveryMode: CourseDeliveryMode.EXTERNAL_LIVE_ROOM,
          status: CourseStatus.PUBLISHED,
          visibility: CourseVisibility.PUBLIC,
          priceAmount: money(350, 100, i),
          currencyCode: 'EGP',
          publishedAt: daysAgo(i % 90),
        },
        update: {
          status: CourseStatus.PUBLISHED,
          visibility: CourseVisibility.PUBLIC,
          priceAmount: money(350, 100, i),
          currencyCode: 'EGP',
          publishedAt: daysAgo(i % 90),
        },
      });

      const scheduleId = uuid(`bulk-course-schedule-${i}`);
      const scheduleStartsAt = daysFromNow((i % 30) + 3);
      const scheduleEndsAt = addDays(scheduleStartsAt, 13);
      const enrollmentOpenAt = daysAgo((i % 7) + 2);
      const enrollmentCloseAt = daysFromNow(1);
      await prisma.courseSchedule.upsert({
        where: { scheduleCode: `BULK-SCH-${i}` },
        create: {
          id: scheduleId,
          courseId,
          scheduleCode: `BULK-SCH-${i}`,
          status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
          createdByUserId: supportUserId,
          plannedDurationDays: 14,
          plannedLectureCount: 4,
          enrollmentOpenAt,
          enrollmentCloseAt,
          startsAt: scheduleStartsAt,
          endsAt: scheduleEndsAt,
          timezone: pick(TIMEZONES, i),
          externalRoomProvider: 'ZOOM',
          externalRoomJoinUrl: `https://meet.example.com/bulk-course-${i}`,
          externalRoomHostUrl: `https://host.example.com/bulk-course-${i}`,
        },
        update: {
          status: CourseScheduleStatus.OPEN_FOR_ENROLLMENT,
          createdByUserId: supportUserId,
          plannedDurationDays: 14,
          plannedLectureCount: 4,
          enrollmentOpenAt,
          enrollmentCloseAt,
          startsAt: scheduleStartsAt,
          endsAt: scheduleEndsAt,
          timezone: pick(TIMEZONES, i),
          externalRoomProvider: 'ZOOM',
          externalRoomJoinUrl: `https://meet.example.com/bulk-course-${i}`,
          externalRoomHostUrl: `https://host.example.com/bulk-course-${i}`,
        },
      });

      const lectureOffsets = [0, 3, 7, 10];
      for (
        let lectureIndex = 0;
        lectureIndex < lectureOffsets.length;
        lectureIndex += 1
      ) {
        const sessionOrder = lectureIndex + 1;
        const lectureStart = addDays(
          scheduleStartsAt,
          lectureOffsets[lectureIndex],
        );
        const lectureEnd = addHours(lectureStart, 2);

        await prisma.courseSession.upsert({
          where: {
            courseScheduleId_sessionOrder: {
              courseScheduleId: scheduleId,
              sessionOrder,
            },
          },
          create: {
            id: uuid(`bulk-course-session-${i}-${sessionOrder}`),
            courseScheduleId: scheduleId,
            createdByUserId: supportUserId,
            sessionTitle: `Lecture ${sessionOrder}`,
            sessionOrder,
            startsAt: lectureStart,
            endsAt: lectureEnd,
            attendanceTrackingEnabled: true,
            isMandatory: true,
            externalRoomProvider: 'ZOOM',
            externalRoomJoinUrl: `https://meet.example.com/bulk-course-${i}/lecture-${sessionOrder}`,
            externalRoomHostUrl: `https://host.example.com/bulk-course-${i}/lecture-${sessionOrder}`,
          },
          update: {
            createdByUserId: supportUserId,
            sessionTitle: `Lecture ${sessionOrder}`,
            startsAt: lectureStart,
            endsAt: lectureEnd,
            attendanceTrackingEnabled: true,
            isMandatory: true,
            externalRoomProvider: 'ZOOM',
            externalRoomJoinUrl: `https://meet.example.com/bulk-course-${i}/lecture-${sessionOrder}`,
            externalRoomHostUrl: `https://host.example.com/bulk-course-${i}/lecture-${sessionOrder}`,
          },
        });
      }

      for (let e = 1; e <= 5; e += 1) {
        const user = pick(patientUsers, i * 7 + e);
        const enrollmentId = uuid(`bulk-enrollment-${i}-${e}`);
        const enrollmentStatus = pick(
          [
            EnrollmentStatus.ACTIVE,
            EnrollmentStatus.COMPLETED,
            EnrollmentStatus.CANCELLED,
          ],
          e,
        );
        const paymentStatus = e % 4 === 0 ? 'PENDING' : 'CAPTURED';

        await prisma.enrollment.upsert({
          where: { id: enrollmentId },
          create: {
            id: enrollmentId,
            courseId,
            courseScheduleId: scheduleId,
            userId: user.userId,
            enrollmentStatus,
            paymentStatus,
            attendanceStatus: pick(
              [
                EnrollmentAttendanceStatus.NOT_STARTED,
                EnrollmentAttendanceStatus.PARTIALLY_ATTENDED,
                EnrollmentAttendanceStatus.ATTENDED,
              ],
              e,
            ),
            enrolledAt: daysAgo(i + e),
          },
          update: {
            courseId,
            courseScheduleId: scheduleId,
            userId: user.userId,
            enrollmentStatus,
            paymentStatus,
          },
        });
      }

      await prisma.courseApproval.upsert({
        where: { id: uuid(`bulk-course-approval-${i}`) },
        create: {
          id: uuid(`bulk-course-approval-${i}`),
          courseId,
          reviewedByUserId: supportUserId,
          decision: CourseReviewDecision.APPROVED,
          reviewNote: 'Seed-approved course',
        },
        update: {},
      });
    }
  },
};
