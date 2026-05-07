import { BadRequestException } from '@nestjs/common';
import { ValidateSessionScheduleCompatibilityService } from './validate-session-schedule-compatibility.service';

describe('ValidateSessionScheduleCompatibilityService', () => {
  const availabilitySlotRepository = {
    listActiveByPractitioner: jest.fn(),
  };
  const availabilityExceptionRepository = {
    listActiveForRange: jest.fn(),
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
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a matching weekly window duration', async () => {
    availabilitySlotRepository.listActiveByPractitioner.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
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

  it('rejects a duration that does not match the available window', async () => {
    availabilitySlotRepository.listActiveByPractitioner.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
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

  it('allows wildcard extra availability windows for any duration', async () => {
    availabilitySlotRepository.listActiveByPractitioner.mockResolvedValue([]);
    availabilityExceptionRepository.listActiveForRange.mockResolvedValue([]);
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
});
