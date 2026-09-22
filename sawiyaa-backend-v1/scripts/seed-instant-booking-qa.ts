import { AvailabilityWeekday, PresenceStatus, PrismaClient } from '@prisma/client';
import { seedIds } from '../prisma/seed/shared/seed.constants';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const appEnv = (process.env.APP_ENV ?? 'development').toLowerCase();
  const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
  if (appEnv === 'production' || nodeEnv === 'production') {
    throw new Error('Instant Booking QA fixture is blocked in production.');
  }

  const practitionerId = seedIds.practitionerProfiles.practitionerJ;
  const now = new Date();

  await prisma.practitionerProfile.update({
    where: { id: practitionerId },
    data: {
      status: 'APPROVED',
      isPublicProfilePublished: true,
      isOnlineToggleEnabled: true,
      isInstantBookingEnabled: true,
      instantBookingPrice30Egp: '540',
      instantBookingPrice30Usd: '33',
      instantBookingPrice60Egp: '980',
      instantBookingPrice60Usd: '58',
    },
  });

  await prisma.practitionerPresence.upsert({
    where: { practitionerId },
    create: {
      practitionerId,
      status: PresenceStatus.ONLINE,
      isInstantBookingEnabled: true,
      lastSeenAtUtc: now,
      lastHeartbeatAtUtc: now,
      manuallySetAtUtc: now,
    },
    update: {
      status: PresenceStatus.ONLINE,
      isInstantBookingEnabled: true,
      lastSeenAtUtc: now,
      lastHeartbeatAtUtc: now,
      manuallySetAtUtc: now,
    },
  });

  const timezone = 'Africa/Cairo';
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(now).toUpperCase() as AvailabilityWeekday;
  const currentWeek = await prisma.practitionerAvailabilityWeek.findFirst({
    where: {
      practitionerId,
      status: 'PUBLISHED',
      weekStartDate: { lte: now },
      weekEndDate: { gte: now },
    },
    orderBy: { weekStartDate: 'desc' },
    select: { id: true },
  });

  if (!currentWeek) {
    throw new Error('Instant Booking QA fixture requires a published current availability week.');
  }

  await prisma.practitionerAvailabilityWeekSlot.deleteMany({
    where: { weekId: currentWeek.id },
  });
  await prisma.practitionerAvailabilityWeekSlot.create({
    data: {
      weekId: currentWeek.id,
      weekday,
      startMinuteOfDay: 0,
      endMinuteOfDay: 24 * 60,
      durationMinutes: 30,
      timezone,
    },
  });

  console.log(JSON.stringify({
    fixture: 'instant-booking-qa',
    patientEmail: 'omar.patient@hesba.local',
    practitionerEmail: 'dr.hassan@hesba.local',
    practitionerSlug: 'dr-hassan-tarek',
    practitionerId,
    availableNowBasis: {
      approved: true,
      publicProfilePublished: true,
      instantBookingEnabled: true,
      presence: 'ONLINE',
      heartbeatAtUtc: now.toISOString(),
      availability: `${weekday} 00:00-24:00 ${timezone}`,
      prices: { '30EGP': 540, '60EGP': 980, '30USD': 33, '60USD': 58 },
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
