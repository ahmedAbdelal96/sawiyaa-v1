import { BadRequestException } from '@nestjs/common';
import { ValidateSessionScheduleCompatibilityService } from './validate-session-schedule-compatibility.service';

describe('ValidateSessionScheduleCompatibilityService', () => {
  const availabilitySlotRepository = {
    listActiveByPractitioner: jest.fn(),
  };
  const availabilityExceptionRepository = {
    listActiveForRange: jest.fn(),
  };
  const sessionRepository = {
    listBlockingSessionRangesInRangeForPractitioner: jest.fn(),
  };
  const resolvePractitionerTimezoneService = {
    resolve: jest.fn().mockReturnValue('UTC'),
  };
  const buildAvailabilityWindowsService = {
    buildForRange: jest.fn(),
  };

  const service = new ValidateSessionScheduleCompatibilityService(
    availabilitySlotRepository as any,
    availabilityExceptionRepository as any,
    resolvePractitionerTimezoneService as any,
    buildAvailabilityWindowsService as any,
    sessionRepository as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    resolvePractitionerTimezoneService.resolve.mockReturnValue('UTC');
  });

  it('accepts a matching weekly window duration', async () => {
    availabilitySlotRepository.listActiveByPractitioner.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildAvailabilityWindowsService.buildForRange.mockReturnValue([
      {
        startsAt: '2026-04-05T08:00:00.000Z',
        endsAt: '2026-04-05T08:30:00.000Z',
        durationMinutes: 30,
      },
    ]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-04-05T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-04-05T08:30:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).resolves.toEqual({ timezone: 'UTC' });
  });

  it('accepts a requested UTC instant at a local-time window edge that crosses the UTC day boundary', async () => {
    availabilitySlotRepository.listActiveByPractitioner.mockResolvedValue([
      {
        id: 'slot-1',
        timezone: 'Asia/Riyadh',
      },
    ]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildAvailabilityWindowsService.buildForRange.mockReturnValue([
      {
        startsAt: '2026-04-04T21:30:00.000Z',
        endsAt: '2026-04-04T22:00:00.000Z',
        durationMinutes: 30,
      },
    ]);
    resolvePractitionerTimezoneService.resolve.mockReturnValue('Asia/Riyadh');

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'Asia/Riyadh',
        requestedStartAtUtc: new Date('2026-04-04T21:30:00.000Z'),
        requestedEndAtUtc: new Date('2026-04-04T22:00:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).resolves.toEqual({ timezone: 'Asia/Riyadh' });

    expect(resolvePractitionerTimezoneService.resolve).toHaveBeenCalledWith({
      weeklySlots: [{ id: 'slot-1', timezone: 'Asia/Riyadh' }],
      fallbackTimezone: 'Asia/Riyadh',
    });
  });

  it('rejects a duration that does not match the available window', async () => {
    availabilitySlotRepository.listActiveByPractitioner.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildAvailabilityWindowsService.buildForRange.mockReturnValue([
      {
        startsAt: '2026-04-05T08:00:00.000Z',
        endsAt: '2026-04-05T09:00:00.000Z',
        durationMinutes: 60,
      },
    ]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-04-05T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-04-05T08:30:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the requested UTC instant falls outside the available window', async () => {
    availabilitySlotRepository.listActiveByPractitioner.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildAvailabilityWindowsService.buildForRange.mockReturnValue([
      {
        startsAt: '2026-04-04T21:30:00.000Z',
        endsAt: '2026-04-04T22:00:00.000Z',
        durationMinutes: 30,
      },
    ]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'Asia/Riyadh',
        requestedStartAtUtc: new Date('2026-04-04T22:00:01.000Z'),
        requestedEndAtUtc: new Date('2026-04-04T22:30:01.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows wildcard extra availability windows for any duration', async () => {
    availabilitySlotRepository.listActiveByPractitioner.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([]);
    buildAvailabilityWindowsService.buildForRange.mockReturnValue([
      {
        startsAt: '2026-04-05T08:00:00.000Z',
        endsAt: '2026-04-05T09:00:00.000Z',
        durationMinutes: null,
      },
    ]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-04-05T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-04-05T09:00:00.000Z'),
        requestedDurationMinutes: 60,
      }),
    ).resolves.toEqual({ timezone: 'UTC' });
  });

  it('passes overlapping blocking sessions into availability calculation', async () => {
    availabilitySlotRepository.listActiveByPractitioner.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
    sessionRepository.listBlockingSessionRangesInRangeForPractitioner.mockResolvedValue([
      {
        scheduledStartAt: new Date('2026-04-05T08:00:00.000Z'),
        scheduledEndAt: new Date('2026-04-05T08:30:00.000Z'),
      },
    ]);
    buildAvailabilityWindowsService.buildForRange.mockReturnValue([]);

    await expect(
      service.assertFitsPractitionerAvailability({
        practitionerId: 'practitioner-1',
        practitionerTimezone: 'UTC',
        requestedStartAtUtc: new Date('2026-04-05T08:00:00.000Z'),
        requestedEndAtUtc: new Date('2026-04-05T08:30:00.000Z'),
        requestedDurationMinutes: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      buildAvailabilityWindowsService.buildForRange,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        bookedSessions: [
          {
            startsAt: new Date('2026-04-05T08:00:00.000Z'),
            endsAt: new Date('2026-04-05T08:30:00.000Z'),
          },
        ],
      }),
    );
  });
});
