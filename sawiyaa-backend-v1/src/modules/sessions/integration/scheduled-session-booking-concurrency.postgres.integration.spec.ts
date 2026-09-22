import { randomUUID } from 'node:crypto';
import {
  AvailabilityWeekStatus,
  AvailabilityWeekday,
  PractitionerStatus,
  PractitionerType,
  SessionMode,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PractitionerAvailabilityWeekRepository } from '@modules/availability/repositories/practitioner-availability-week.repository';
import { AvailabilityExceptionRepository } from '@modules/availability/repositories/availability-exception.repository';
import { BuildPublishedWeekAvailabilityWindowsService } from '@modules/availability/services/build-published-week-availability-windows.service';
import { AvailabilityWeekCalendarService } from '@modules/availability/services/availability-week-calendar.service';
import { ResolvePractitionerTimezoneService } from '@modules/availability/services/resolve-practitioner-timezone.service';
import { SessionRepository } from '../repositories/session.repository';
import { SessionCodeGeneratorService } from '../services/session-code-generator.service';
import { ValidateSessionBookingRequestService } from '../services/validate-session-booking-request.service';
import { ValidateSessionConflictsService } from '../services/validate-session-conflicts.service';
import { ValidateSessionDurationService } from '../services/validate-session-duration.service';
import { ValidateSessionScheduleCompatibilityService } from '../services/validate-session-schedule-compatibility.service';
import { SessionMapper } from '../mappers/session.mapper';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionPractitionerRepository } from '../repositories/session-practitioner.repository';
import { CreateScheduledSessionUseCase } from '../use-cases/create-scheduled-session.use-case';

const databaseUrl = process.env.DATABASE_URL;
const parsed = databaseUrl ? new URL(databaseUrl) : null;
const hasIsolatedDatabase = Boolean(
  parsed &&
  ['127.0.0.1', 'localhost'].includes(parsed.hostname) &&
  ['5432', '55438'].includes(parsed.port) &&
  /^\/sawiyaa_redteam_[a-z0-9_]+$/.test(parsed.pathname),
);
const describeIfDatabase = hasIsolatedDatabase ? describe : describe.skip;

describeIfDatabase('Scheduled booking: published availability and overlap concurrency', () => {
  const prisma = new PrismaService();
  const sessionRepository = new SessionRepository(
    prisma,
    new SessionCodeGeneratorService(prisma),
  );
  const lifecycle = {
    transitionIfCurrentStatus: jest.fn(),
  } as never;
  const compatibility = new ValidateSessionScheduleCompatibilityService(
    new PractitionerAvailabilityWeekRepository(prisma),
    new AvailabilityExceptionRepository(prisma),
    new AvailabilityWeekCalendarService(),
    new ResolvePractitionerTimezoneService(),
    new BuildPublishedWeekAvailabilityWindowsService(),
    sessionRepository,
  );
  const booking = new CreateScheduledSessionUseCase(
    { get: (_key: string, fallback: number) => fallback } as never,
    prisma,
    new SessionPatientRepository(prisma),
    new SessionPractitionerRepository(prisma),
    sessionRepository,
    new SessionMapper(),
    new ValidateSessionDurationService(),
    new ValidateSessionBookingRequestService(),
    compatibility,
    new ValidateSessionConflictsService(prisma, sessionRepository, lifecycle),
    new PublicPractitionerVisibilityPolicy(),
  );

  beforeAll(async () => prisma.$connect());
  afterAll(async () => prisma.$disconnect());

  it('creates one valid session when the same slot is booked concurrently, across ten iterations', async () => {
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const suffix = `${iteration}-${randomUUID()}`;
      const patientUserId = randomUUID();
      const practitionerUserId = randomUUID();
      const patientId = randomUUID();
      const practitionerId = randomUUID();
      const specialtyId = randomUUID();
      const weekId = randomUUID();
      const start = new Date(Date.now() + 3 * 86_400_000);
      start.setUTCHours(10, 0, 0, 0);
      const weekStart = new Date(start);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
      weekStart.setUTCHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

      await prisma.user.createMany({
        data: [
          { id: patientUserId, displayName: `Race patient ${suffix}`, timezone: 'UTC' },
          { id: practitionerUserId, displayName: `Race practitioner ${suffix}`, timezone: 'UTC' },
        ],
      });
      await prisma.patientProfile.create({ data: { id: patientId, userId: patientUserId } });
      await prisma.specialty.create({
        data: { id: specialtyId, slug: `race-${suffix}`, nameEn: 'Race test', isActive: true },
      });
      await prisma.practitionerProfile.create({
        data: {
          id: practitionerId,
          userId: practitionerUserId,
          publicSlug: `race-${suffix}`,
          practitionerType: PractitionerType.OTHER,
          status: PractitionerStatus.APPROVED,
          isPublicProfilePublished: true,
          professionalTitle: 'Therapist',
          bio: 'Concurrency proof',
          sessionPrice30Egp: 100,
          sessionPrice30Usd: 10,
          sessionPrice60Egp: 180,
          sessionPrice60Usd: 18,
          specialties: { create: { specialtyId } },
        },
      });
      await prisma.practitionerAvailabilityWeek.create({
        data: {
          id: weekId,
          practitionerId,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          timezone: 'UTC',
          status: AvailabilityWeekStatus.PUBLISHED,
          publishedAt: new Date(),
          slots: {
            create: {
              weekday: [
                AvailabilityWeekday.SUNDAY,
                AvailabilityWeekday.MONDAY,
                AvailabilityWeekday.TUESDAY,
                AvailabilityWeekday.WEDNESDAY,
                AvailabilityWeekday.THURSDAY,
                AvailabilityWeekday.FRIDAY,
                AvailabilityWeekday.SATURDAY,
              ][start.getUTCDay()],
              startMinuteOfDay: 10 * 60,
              endMinuteOfDay: 10 * 60 + 30,
              durationMinutes: 30,
              timezone: 'UTC',
            },
          },
        },
      });

      const attempts = await Promise.allSettled([
        booking.execute({
          userId: patientUserId,
          locale: 'en',
          practitionerSlug: `race-${suffix}`,
          scheduledStartAt: start.toISOString(),
          durationMinutes: 30,
          sessionMode: SessionMode.VIDEO,
        }),
        booking.execute({
          userId: patientUserId,
          locale: 'en',
          practitionerSlug: `race-${suffix}`,
          scheduledStartAt: start.toISOString(),
          durationMinutes: 30,
          sessionMode: SessionMode.VIDEO,
        }),
      ]);

      expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
      expect(attempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(1);

      const sessions = await prisma.session.findMany({
        where: { practitionerId, patientId },
        select: { status: true, scheduledStartAt: true, scheduledEndAt: true },
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        status: SessionStatus.PENDING_PAYMENT,
        scheduledStartAt: start,
        scheduledEndAt: new Date(start.getTime() + 30 * 60_000),
      });
    }
  }, 120_000);
});
