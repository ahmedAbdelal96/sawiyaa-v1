import { BadRequestException } from '@nestjs/common';
import { AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';
import { ValidateSessionScheduleCompatibilityService } from './validate-session-schedule-compatibility.service';

describe('ValidateSessionScheduleCompatibilityService', () => {
  const practitionerAvailabilityWeekRepository = {
    findPublishedByPractitionerAndWeekStarts: jest.fn(),
  };
  const availabilityExceptionRepository = {
    listActiveForRange: jest.fn(),
  };
  const availabilityWeekCalendarService = {
    resolveCurrentAndNextWeekWindow: jest.fn(),
  };
  const resolvePractitionerTimezoneService = {
    resolve: jest.fn().mockReturnValue('UTC'),
  };
  const buildPublishedWeekAvailabilityWindowsService = {
    buildForRange: jest.fn(),
  };
  const sessionRepository = {
    listBlockingSessionRangesInRangeForPractitioner: jest.fn(),
  };

  const service = new ValidateSessionScheduleCompatibilityService(
    practitionerAvailabilityWeekRepository as any,
    availabilityExceptionRepository as any,
    availabilityWeekCalendarService as any,
    resolvePractitionerTimezoneService as any,
    buildPublishedWeekAvailabilityWindowsService as any,
    sessionRepository as any,
  );

  const currentWeekStart = new Date('2026-06-21T00:00:00.000Z');
  const currentWeekEnd = new Date('2026-06-27T00:00:00.000Z');
  const nextWeekStart = new Date('2026-06-28T00:00:00.000Z');
  const nextWeekEnd = new Date('2026-07-04T00:00:00.000Z');

  const currentWeek = {
    id: 'week-current',
    weekStartDate: currentWeekStart,
    weekEndDate: currentWeekEnd,
    timezone: 'UTC',
    status: AvailabilityWeekStatus.PUBLISHED,
    slots: [
      {
        id: 'slot-current',
        weekday: AvailabilityWeekday.SUNDAY,
        startMinuteOfDay: 480,
        endMinuteOfDay: 540,
        durationMinutes: 30,
        timezone: 'UTC',
      },
    ],
  };

  const nextWeek = {
    id: 'week-next',
    weekStartDate: nextWeekStart,
    weekEndDate: nextWeekEnd,
    timezone: 'UTC',
    status: AvailabilityWeekStatus.PUBLISHED,
    slots: [
      {
        id: 'slot-next',
        weekday: AvailabilityWeekday.SUNDAY,
        startMinuteOfDay: 600,
        endMinuteOfDay: 660,
        durationMinutes: 30,
        timezone: 'UTC',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow.mockReturnValue({
      currentWeek: {
        startDate: currentWeekStart,
        endDate: currentWeekEnd,
        startDateIso: '2026-06-21',
        endDateIso: '2026-06-27',
      },
      nextWeek: {
        startDate: nextWeekStart,
        endDate: nextWeekEnd,
        startDateIso: '2026-06-28',
        endDateIso: '2026-07-04',
      },
    });
    resolvePractitionerTimezoneService.resolve.mockReturnValue('UTC');
  });

  it('accepts a matching published-week window duration', async () => {
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue([
      currentWeek,
      nextWeek,
    ]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildPublishedWeekAvailabilityWindowsService.buildForRange.mockReturnValue([
      {
        startsAt: '2026-06-21T08:00:00.000Z',
        endsAt: '2026-06-21T08:30:00.000Z',
        durationMinutes: 30,
      },
    ]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-06-21T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-06-21T08:30:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).resolves.toEqual({ timezone: 'UTC' });

    expect(resolvePractitionerTimezoneService.resolve).toHaveBeenCalledWith({
      fallbackTimezone: 'UTC',
    });
    expect(
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts,
    ).toHaveBeenCalledWith('practitioner-1', [currentWeekStart, nextWeekStart]);
    expect(buildPublishedWeekAvailabilityWindowsService.buildForRange).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'UTC',
        weeks: [currentWeek, nextWeek],
        exceptions: [],
        bookedSessions: [],
        fromUtc: new Date('2026-06-21T08:00:00.000Z'),
        toUtc: new Date('2026-06-21T08:30:00.000Z'),
      }),
    );
  });

  it('rejects when only legacy recurring slots would have existed before the cutover', async () => {
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildPublishedWeekAvailabilityWindowsService.buildForRange.mockReturnValue([]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-06-21T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-06-21T08:30:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when only draft weeks are available in the repository slice', async () => {
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildPublishedWeekAvailabilityWindowsService.buildForRange.mockReturnValue([]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-06-22T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-06-22T08:30:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when only archived weeks are available in the repository slice', async () => {
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildPublishedWeekAvailabilityWindowsService.buildForRange.mockReturnValue([]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-06-23T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-06-23T08:30:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a partially overlapping requested slot', async () => {
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue([
      currentWeek,
      nextWeek,
    ]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildPublishedWeekAvailabilityWindowsService.buildForRange.mockReturnValue([
      {
        startsAt: '2026-06-21T08:00:00.000Z',
        endsAt: '2026-06-21T08:30:00.000Z',
        durationMinutes: 30,
      },
    ]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-06-21T08:15:00.000Z'),
        requestedEndAtUtc: new Date('2026-06-21T08:45:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when an exception removes the requested slot from the published window slice', async () => {
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue([
      currentWeek,
      nextWeek,
    ]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([
      {
        id: 'exception-block',
        practitionerId: 'practitioner-1',
        availabilityWeekId: 'week-current',
        type: 'BLOCK',
        startsAtUtc: new Date('2026-06-21T08:00:00.000Z'),
        endsAtUtc: new Date('2026-06-21T08:30:00.000Z'),
        reason: null,
        source: 'MANUAL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildPublishedWeekAvailabilityWindowsService.buildForRange.mockReturnValue([]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-06-21T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-06-21T08:30:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the resolved practitioner timezone to compute current and next week boundaries', async () => {
    resolvePractitionerTimezoneService.resolve.mockReturnValue('Asia/Riyadh');
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildPublishedWeekAvailabilityWindowsService.buildForRange.mockReturnValue([]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'Asia/Riyadh',
        requestedStartAtUtc: new Date('2026-06-21T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-06-21T08:30:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow).toHaveBeenCalledWith({
      timezone: 'Asia/Riyadh',
    });
  });

  it('passes overlapping blocking sessions into published-week availability calculation', async () => {
    practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts.mockResolvedValue([
      currentWeek,
      nextWeek,
    ]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([
      {
        scheduledStartAt: new Date('2026-06-21T08:00:00.000Z'),
        scheduledEndAt: new Date('2026-06-21T08:30:00.000Z'),
      },
    ]);
    buildPublishedWeekAvailabilityWindowsService.buildForRange.mockReturnValue([]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-06-21T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-06-21T08:30:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      buildPublishedWeekAvailabilityWindowsService.buildForRange,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        bookedSessions: [
          {
            startsAt: new Date('2026-06-21T08:00:00.000Z'),
            endsAt: new Date('2026-06-21T08:30:00.000Z'),
          },
        ],
      }),
    );
  });

  it('rejects if the requested slot falls outside the managed current/next week range', async () => {
    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-07-05T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-07-05T08:30:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts,
    ).not.toHaveBeenCalled();
  });
});
