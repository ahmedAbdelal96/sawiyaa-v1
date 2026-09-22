import { randomUUID } from 'node:crypto';
import {
  AvailabilityWeekStatus,
  AvailabilityWeekday,
  PackageSchedulePolicy,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PractitionerStatus,
  PractitionerType,
  SessionEventType,
  SessionMode,
  SessionPaymentCoverageType,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { PractitionerAvailabilityWeekRepository } from '@modules/availability/repositories/practitioner-availability-week.repository';
import { AvailabilityExceptionRepository } from '@modules/availability/repositories/availability-exception.repository';
import { BuildPublishedWeekAvailabilityWindowsService } from '@modules/availability/services/build-published-week-availability-windows.service';
import { AvailabilityWeekCalendarService } from '@modules/availability/services/availability-week-calendar.service';
import { ResolvePractitionerTimezoneService } from '@modules/availability/services/resolve-practitioner-timezone.service';
import { PatientPackagePurchaseRepository } from '../repositories/package-purchase.repository';
import { PackageEntitlementService } from '../services/package-entitlement.service';
import { BookPackageSessionUseCase } from '../use-cases/book-package-session.use-case';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';
import { SessionCodeGeneratorService } from '@modules/sessions/services/session-code-generator.service';
import { SessionLifecycleService } from '@modules/sessions/services/session-lifecycle.service';
import { ValidateSessionStatusTransitionService } from '@modules/sessions/services/validate-session-status-transition.service';
import { ValidateSessionBookingRequestService } from '@modules/sessions/services/validate-session-booking-request.service';
import { ValidateSessionConflictsService } from '@modules/sessions/services/validate-session-conflicts.service';
import { ValidateSessionDurationService } from '@modules/sessions/services/validate-session-duration.service';
import { ValidateSessionScheduleCompatibilityService } from '@modules/sessions/services/validate-session-schedule-compatibility.service';
import { SessionMapper } from '@modules/sessions/mappers/session.mapper';

const databaseUrl = process.env.DATABASE_URL;
const parsed = databaseUrl ? new URL(databaseUrl) : null;
const hasIsolatedDatabase = Boolean(
  parsed &&
  ['127.0.0.1', 'localhost'].includes(parsed.hostname) &&
  ['5432', '55438'].includes(parsed.port) &&
  /^\/sawiyaa_redteam_[a-z0-9_]+$/.test(parsed.pathname),
);
const describeIfDatabase = hasIsolatedDatabase ? describe : describe.skip;

describeIfDatabase('Package session booking: entitlement concurrency', () => {
  const prisma = new PrismaService();
  const sessionRepository = new SessionRepository(
    prisma,
    new SessionCodeGeneratorService(prisma),
  );
  const lifecycle = new SessionLifecycleService(
    sessionRepository,
    new ValidateSessionStatusTransitionService(),
  );
  const booking = new BookPackageSessionUseCase(
    prisma,
    new PatientProfileRepository(prisma),
    new PatientPackagePurchaseRepository(prisma),
    sessionRepository,
    new SessionMapper(),
    lifecycle,
    new ValidateSessionBookingRequestService(),
    new ValidateSessionDurationService(),
    new ValidateSessionScheduleCompatibilityService(
      new PractitionerAvailabilityWeekRepository(prisma),
      new AvailabilityExceptionRepository(prisma),
      new AvailabilityWeekCalendarService(),
      new ResolvePractitionerTimezoneService(),
      new BuildPublishedWeekAvailabilityWindowsService(),
      sessionRepository,
    ),
    new ValidateSessionConflictsService(prisma, sessionRepository, lifecycle),
    {
      resolve: () =>
        Promise.resolve({
          version: 1,
          scheduleRevision: 1,
          capturedAt: new Date().toISOString(),
          reminder: {
            reminderOffsetsMinutes: [],
            lateReminderEnabled: false,
            lateReminderMinutesAfterStart: 15,
            inAppRemindersEnabled: false,
            emailRemindersEnabled: false,
          },
          join: { joinEarlyMinutes: 15, joinAfterEndGraceMinutes: 15 },
        }),
      withScheduleRevision: (policy: unknown) => policy,
    } as never,
    new PackageEntitlementService(),
    { notifySessionConfirmed: () => Promise.resolve() } as never,
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('allows exactly one booking for one available entitlement across ten isolated races', async () => {
    const country = await prisma.country.upsert({
      where: { isoCode: 'EG' },
      create: { isoCode: 'EG', name: 'Egypt', slug: 'egypt' },
      update: {},
    });

    for (let iteration = 0; iteration < 10; iteration += 1) {
      const suffix = `${iteration}-${randomUUID()}`;
      const patientUserId = randomUUID();
      const practitionerUserId = randomUUID();
      const patientId = randomUUID();
      const practitionerId = randomUUID();
      const planId = randomUUID();
      const purchaseId = randomUUID();
      const paymentId = randomUUID();
      // Keep every run inside the current/next published availability window.
      // The two callers intentionally choose different appointments, proving
      // the race is on the entitlement rather than on a duplicate-slot check.
      const start = new Date(Date.now() + 3 * 86_400_000);
      start.setUTCHours(10, 0, 0, 0);
      const competingStart = new Date(start);
      competingStart.setUTCHours(11, 0, 0, 0);
      const weekStart = new Date(start);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
      weekStart.setUTCHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      const weekdays = [
        AvailabilityWeekday.SUNDAY,
        AvailabilityWeekday.MONDAY,
        AvailabilityWeekday.TUESDAY,
        AvailabilityWeekday.WEDNESDAY,
        AvailabilityWeekday.THURSDAY,
        AvailabilityWeekday.FRIDAY,
        AvailabilityWeekday.SATURDAY,
      ];

      await prisma.user.createMany({
        data: [
          {
            id: patientUserId,
            displayName: `Package patient ${suffix}`,
            timezone: 'UTC',
          },
          {
            id: practitionerUserId,
            displayName: `Package practitioner ${suffix}`,
            timezone: 'UTC',
          },
        ],
      });
      await prisma.patientProfile.create({
        data: { id: patientId, userId: patientUserId, countryId: country.id },
      });
      await prisma.practitionerProfile.create({
        data: {
          id: practitionerId,
          userId: practitionerUserId,
          publicSlug: `package-booking-${suffix}`,
          practitionerType: PractitionerType.OTHER,
          status: PractitionerStatus.APPROVED,
          isPublicProfilePublished: true,
          countryId: country.id,
          acceptsPackages: true,
        },
      });
      await prisma.practitionerAvailabilityWeek.create({
        data: {
          id: randomUUID(),
          practitionerId,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          timezone: 'UTC',
          status: AvailabilityWeekStatus.PUBLISHED,
          publishedAt: new Date(),
          slots: {
            create: {
              weekday: weekdays[start.getUTCDay()],
              startMinuteOfDay: 9 * 60,
              endMinuteOfDay: 18 * 60,
              durationMinutes: 30,
              timezone: 'UTC',
            },
          },
        },
      });
      await prisma.packagePlan.create({
        data: {
          id: planId,
          code: `BOOK_${suffix.replace(/-/g, '').slice(0, 80)}`,
          sessionCount: 1,
          discountPercent: 10,
          title: 'One session package',
          description: 'Concurrency booking proof',
        },
      });
      await prisma.patientPackagePurchase.create({
        data: {
          id: purchaseId,
          packagePlanId: planId,
          practitionerId,
          patientId,
          status: 'ACTIVE',
          paidAt: new Date(),
          activatedAt: new Date(),
          titleSnapshot: 'One session package',
          descriptionSnapshot: 'Concurrency booking proof',
          slugSnapshot: `BOOK_${suffix}`,
          packageVersionSnapshot: 1,
          planIdSnapshot: planId,
          planCodeSnapshot: `BOOK_${suffix}`,
          sessionCountSnapshot: 1,
          discountPercentSnapshot: 10,
          baseSessionPriceEgpSnapshot: 100,
          currencyCodeSnapshot: 'EGP',
          selectedBaseSessionPriceSnapshot: 100,
          undiscountedTotalSnapshot: 100,
          discountAmountSnapshot: 10,
          patientPayableTotalSnapshot: 90,
          platformDiscountShareSnapshot: 5,
          practitionerDiscountShareSnapshot: 5,
          commissionModeSnapshot: 'SNAPSHOT',
          platformOriginalShareSnapshot: 45,
          practitionerOriginalShareSnapshot: 55,
          platformFinalShareSnapshot: 40,
          practitionerFinalShareSnapshot: 50,
          sessionDurationMinutesSnapshot: 30,
          sessionModeSnapshot: SessionMode.VIDEO,
          schedulePolicySnapshot: PackageSchedulePolicy.ALLOW_SCHEDULE_LATER,
          priceEgpSnapshot: 100,
          selectedCurrencyCode: 'EGP',
          selectedAmountSnapshot: 90,
        },
      });
      await prisma.payment.create({
        data: {
          id: paymentId,
          patientId,
          practitionerId,
          paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
          provider: PaymentProvider.PAYMOB,
          status: PaymentStatus.CAPTURED,
          amountSubtotal: 100,
          amountDiscount: 10,
          amountTotal: 90,
          amountFromWallet: 0,
          amountFromGateway: 90,
          currencyCode: 'EGP',
          capturedAt: new Date(),
          providerPaymentRef: `booking-payment-${suffix}`,
          metadataJson: { packagePurchaseId: purchaseId },
        },
      });
      await prisma.patientPackagePurchase.update({
        where: { id: purchaseId },
        data: { paymentId },
      });

      const attempts = await Promise.allSettled([
        booking.execute({
          userId: patientUserId,
          locale: 'en',
          purchaseId,
          scheduledStartAt: start.toISOString(),
        }),
        booking.execute({
          userId: patientUserId,
          locale: 'en',
          purchaseId,
          scheduledStartAt: competingStart.toISOString(),
        }),
      ]);
      expect(
        attempts.filter((attempt) => attempt.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        attempts.filter((attempt) => attempt.status === 'rejected'),
      ).toHaveLength(1);

      const [purchase, sessions, sessionEvents] = await Promise.all([
        prisma.patientPackagePurchase.findUniqueOrThrow({
          where: { id: purchaseId },
        }),
        prisma.session.findMany({ where: { packagePurchaseId: purchaseId } }),
        prisma.sessionEvent.findMany({
          where: { session: { packagePurchaseId: purchaseId } },
          orderBy: { createdAt: 'asc' },
        }),
      ]);
      const packagePayments = await prisma.payment.findMany({
        where: {
          patientId,
          practitionerId,
          paymentPurpose: PaymentPurpose.SESSION_PACKAGE_PURCHASE,
        },
      });
      expect(purchase.status).toBe('ACTIVE');
      expect(packagePayments).toHaveLength(1);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].status).toBe(SessionStatus.UPCOMING);
      expect(sessions[0].paymentCoverageType).toBe(
        SessionPaymentCoverageType.PACKAGE,
      );
      expect(sessions[0].packageSessionIndex).toBe(1);
      expect(
        sessionEvents.filter(
          (event) => event.eventType === SessionEventType.SESSION_CREATED,
        ),
      ).toHaveLength(1);
      expect(
        sessionEvents.filter(
          (event) => event.eventType === SessionEventType.SESSION_CONFIRMED,
        ),
      ).toHaveLength(1);
      expect(
        sessionEvents.filter(
          (event) => event.eventType === SessionEventType.PAYMENT_CONFIRMED,
        ),
      ).toHaveLength(1);

      const reserved = sessions.filter(
        (session) => session.status === SessionStatus.UPCOMING,
      ).length;
      const consumed = sessions.filter(
        (session) => session.status === SessionStatus.COMPLETED,
      ).length;
      const available = purchase.sessionCountSnapshot - reserved - consumed;
      expect(available).toBe(0);
      expect(available + reserved + consumed).toBe(
        purchase.sessionCountSnapshot,
      );
      expect(
        sessions.some(
          (session) =>
            session.packageSessionIndex! > purchase.sessionCountSnapshot,
        ),
      ).toBe(false);
    }
  }, 120_000);
});
