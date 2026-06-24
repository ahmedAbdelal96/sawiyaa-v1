import { AvailabilityWeekStatus, AvailabilityWeekday, PrismaClient } from '@prisma/client';
import { seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';

type WeekSlotSeed = {
  weekday: AvailabilityWeekday;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  durationMinutes: 30 | 60;
};

type PractitionerAvailabilityWeekSeed = {
  practitionerId: string;
  timezone: string;
  publicSlug: string;
};

type CalendarDateParts = {
  year: number;
  month: number;
  day: number;
};

function toUtcCalendarDate(input: {
  year: number;
  month: number;
  day: number;
}): Date {
  return new Date(Date.UTC(input.year, input.month - 1, input.day));
}

function getCalendarDateParts(input: Date, timeZone: string): CalendarDateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const rawParts = formatter.formatToParts(input).reduce<Record<string, string>>(
    (accumulator, part) => {
      if (part.type !== 'literal') {
        accumulator[part.type] = part.value;
      }

      return accumulator;
    },
    {},
  );

  return {
    year: Number(rawParts.year),
    month: Number(rawParts.month),
    day: Number(rawParts.day),
  };
}

function addDaysToCalendarDate(input: CalendarDateParts, days: number): CalendarDateParts {
  const working = new Date(Date.UTC(input.year, input.month - 1, input.day));
  working.setUTCDate(working.getUTCDate() + days);

  return {
    year: working.getUTCFullYear(),
    month: working.getUTCMonth() + 1,
    day: working.getUTCDate(),
  };
}

function getWeekdayIndex(input: CalendarDateParts): number {
  return new Date(Date.UTC(input.year, input.month - 1, input.day)).getUTCDay();
}

function calendarDateToIsoDate(input: CalendarDateParts): string {
  return `${input.year.toString().padStart(4, '0')}-${input.month
    .toString()
    .padStart(2, '0')}-${input.day.toString().padStart(2, '0')}`;
}

function resolveCurrentAndNextWeekWindow(input: {
  timezone: string;
  now?: Date;
}): {
  currentWeek: {
    startDate: Date;
    endDate: Date;
    startDateIso: string;
    endDateIso: string;
  };
  nextWeek: {
    startDate: Date;
    endDate: Date;
    startDateIso: string;
    endDateIso: string;
  };
} {
  const now = input.now ?? new Date();
  const todayInTimezone = getCalendarDateParts(now, input.timezone);
  const currentWeekStart = addDaysToCalendarDate(
    todayInTimezone,
    -getWeekdayIndex(todayInTimezone),
  );
  const currentWeekEnd = addDaysToCalendarDate(currentWeekStart, 6);
  const nextWeekStart = addDaysToCalendarDate(currentWeekStart, 7);
  const nextWeekEnd = addDaysToCalendarDate(nextWeekStart, 6);

  return {
    currentWeek: {
      startDate: toUtcCalendarDate(currentWeekStart),
      endDate: toUtcCalendarDate(currentWeekEnd),
      startDateIso: calendarDateToIsoDate(currentWeekStart),
      endDateIso: calendarDateToIsoDate(currentWeekEnd),
    },
    nextWeek: {
      startDate: toUtcCalendarDate(nextWeekStart),
      endDate: toUtcCalendarDate(nextWeekEnd),
      startDateIso: calendarDateToIsoDate(nextWeekStart),
      endDateIso: calendarDateToIsoDate(nextWeekEnd),
    },
  };
}

function buildPublishedWeekSlots(): WeekSlotSeed[] {
  return [
    {
      weekday: AvailabilityWeekday.SUNDAY,
      startMinuteOfDay: 9 * 60,
      endMinuteOfDay: 9 * 60 + 30,
      durationMinutes: 30,
    },
    {
      weekday: AvailabilityWeekday.TUESDAY,
      startMinuteOfDay: 13 * 60,
      endMinuteOfDay: 14 * 60,
      durationMinutes: 60,
    },
    {
      weekday: AvailabilityWeekday.THURSDAY,
      startMinuteOfDay: 17 * 60,
      endMinuteOfDay: 17 * 60 + 30,
      durationMinutes: 30,
    },
    {
      weekday: AvailabilityWeekday.SATURDAY,
      startMinuteOfDay: 11 * 60,
      endMinuteOfDay: 12 * 60,
      durationMinutes: 60,
    },
  ];
}

async function upsertPublishedWeek(
  prisma: PrismaClient,
  input: {
    practitionerId: string;
    weekStartDate: Date;
    weekEndDate: Date;
    timezone: string;
    slots: WeekSlotSeed[];
  },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const week = await tx.practitionerAvailabilityWeek.upsert({
      where: {
        practitionerId_weekStartDate: {
          practitionerId: input.practitionerId,
          weekStartDate: input.weekStartDate,
        },
      },
      create: {
        practitionerId: input.practitionerId,
        weekStartDate: input.weekStartDate,
        weekEndDate: input.weekEndDate,
        timezone: input.timezone,
        status: AvailabilityWeekStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      update: {
        weekEndDate: input.weekEndDate,
        timezone: input.timezone,
        status: AvailabilityWeekStatus.PUBLISHED,
        publishedAt: new Date(),
        archivedAt: null,
        copiedFromWeekId: null,
      },
      select: {
        id: true,
      },
    });

    await tx.practitionerAvailabilityWeekSlot.deleteMany({
      where: {
        weekId: week.id,
      },
    });

    if (input.slots.length > 0) {
      await tx.practitionerAvailabilityWeekSlot.createMany({
        data: input.slots.map((slot) => ({
          weekId: week.id,
          weekday: slot.weekday,
          startMinuteOfDay: slot.startMinuteOfDay,
          endMinuteOfDay: slot.endMinuteOfDay,
          durationMinutes: slot.durationMinutes,
          timezone: input.timezone,
        })),
      });
    }
  });
}

const approvedDemoPractitioners: PractitionerAvailabilityWeekSeed[] = [
  {
    practitionerId: seedIds.practitionerProfiles.practitionerB,
    timezone: 'Asia/Riyadh',
    publicSlug: 'dr-mohamed-mahmoud',
  },
  {
    practitionerId: seedIds.practitionerProfiles.practitionerE,
    timezone: 'Africa/Cairo',
    publicSlug: 'dr-youssef-abdallah',
  },
  {
    practitionerId: seedIds.practitionerProfiles.practitionerF,
    timezone: 'Asia/Riyadh',
    publicSlug: 'dr-karim-hassan',
  },
  {
    practitionerId: seedIds.practitionerProfiles.practitionerG,
    timezone: 'Asia/Dubai',
    publicSlug: 'dr-sara-khaled',
  },
  {
    practitionerId: seedIds.practitionerProfiles.practitionerH,
    timezone: 'Asia/Kuwait',
    publicSlug: 'dr-nour-hani',
  },
  {
    practitionerId: seedIds.practitionerProfiles.practitionerI,
    timezone: 'Asia/Qatar',
    publicSlug: 'dr-mariam-ashraf',
  },
  {
    practitionerId: seedIds.practitionerProfiles.practitionerJ,
    timezone: 'Africa/Cairo',
    publicSlug: 'dr-hassan-tarek',
  },
];

export const availabilityWeeksSeedModule: SeedModule = {
  name: 'availability-weeks',
  async run(prisma: PrismaClient): Promise<void> {
    const slots = buildPublishedWeekSlots();
    const now = new Date();

    for (const practitioner of approvedDemoPractitioners) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: practitioner.timezone });
      } catch {
        throw new Error(
          `Invalid timezone configured for ${practitioner.publicSlug}: ${practitioner.timezone}`,
        );
      }

      const window = resolveCurrentAndNextWeekWindow({
        timezone: practitioner.timezone,
        now,
      });

      await upsertPublishedWeek(prisma, {
        practitionerId: practitioner.practitionerId,
        weekStartDate: window.currentWeek.startDate,
        weekEndDate: window.currentWeek.endDate,
        timezone: practitioner.timezone,
        slots,
      });

      await upsertPublishedWeek(prisma, {
        practitionerId: practitioner.practitionerId,
        weekStartDate: window.nextWeek.startDate,
        weekEndDate: window.nextWeek.endDate,
        timezone: practitioner.timezone,
        slots,
      });
    }
  },
};
