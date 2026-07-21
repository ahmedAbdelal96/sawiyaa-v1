const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  await prisma.user.update({
    where: { id: '306e03b3-9a76-429a-adc4-46602125cd87' },
    data: { timezone: 'UTC' },
  });
  const week = await prisma.practitionerAvailabilityWeek.upsert({
    where: {
      practitionerId_weekStartDate: {
        practitionerId: 'd2a248cb-231a-43de-84f7-e6c83fc27968',
        weekStartDate: new Date('2026-07-19T00:00:00.000Z'),
      },
    },
    update: { status: 'PUBLISHED', publishedAt: new Date('2026-07-19T00:00:00.000Z') },
    create: {
      practitionerId: 'd2a248cb-231a-43de-84f7-e6c83fc27968',
      weekStartDate: new Date('2026-07-19T00:00:00.000Z'),
      weekEndDate: new Date('2026-07-26T00:00:00.000Z'),
      timezone: 'UTC',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-07-19T00:00:00.000Z'),
    },
  });
  await prisma.practitionerAvailabilityWeekSlot.upsert({
    where: {
      weekId_weekday_startMinuteOfDay_endMinuteOfDay: {
        weekId: week.id,
        weekday: 'MONDAY',
        startMinuteOfDay: 600,
        endMinuteOfDay: 630,
      },
    },
    update: {},
    create: {
      weekId: week.id,
      weekday: 'MONDAY',
      startMinuteOfDay: 600,
      endMinuteOfDay: 630,
      durationMinutes: 30,
      timezone: 'UTC',
    },
  });
  await prisma.practitionerAvailabilityWeekSlot.upsert({
    where: {
      weekId_weekday_startMinuteOfDay_endMinuteOfDay: {
        weekId: week.id,
        weekday: 'WEDNESDAY',
        startMinuteOfDay: 600,
        endMinuteOfDay: 630,
      },
    },
    update: {},
    create: {
      weekId: week.id,
      weekday: 'WEDNESDAY',
      startMinuteOfDay: 600,
      endMinuteOfDay: 630,
      durationMinutes: 30,
      timezone: 'UTC',
    },
  });
  await prisma.practitionerAvailabilityWeekSlot.upsert({
    where: {
      weekId_weekday_startMinuteOfDay_endMinuteOfDay: {
        weekId: week.id,
        weekday: 'TUESDAY',
        startMinuteOfDay: 600,
        endMinuteOfDay: 630,
      },
    },
    update: {},
    create: {
      weekId: week.id,
      weekday: 'TUESDAY',
      startMinuteOfDay: 600,
      endMinuteOfDay: 630,
      durationMinutes: 30,
      timezone: 'UTC',
    },
  });
  const practitioner = await prisma.practitionerProfile.findUnique({
    where: { id: 'd2a248cb-231a-43de-84f7-e6c83fc27968' },
    select: {
      id: true,
      userId: true,
      publicSlug: true,
      user: { select: { emails: { select: { email: true, isPrimary: true } } } },
    },
  });
  const availability = await prisma.practitionerAvailabilityWeek.findMany({
    where: { practitionerId: practitioner.id },
    select: {
      id: true,
      status: true,
      weekStartDate: true,
      timezone: true,
      slots: { select: { id: true, weekday: true, startMinuteOfDay: true, endMinuteOfDay: true } },
    },
    orderBy: { weekStartDate: 'desc' },
  });
  const sessions = await prisma.session.findMany({
    where: { practitionerId: practitioner.id },
    select: {
      id: true,
      status: true,
      scheduledStartAt: true,
      scheduledEndAt: true,
      sessionMode: true,
      patientId: true,
      conversations: { select: { id: true, status: true } },
    },
    orderBy: { scheduledStartAt: 'desc' },
    take: 10,
  });
  console.log(JSON.stringify({ practitioner, availability, sessions }));
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
