import { BadRequestException, Injectable } from '@nestjs/common';
import { BuildAvailabilityWindowsService } from '@modules/availability/services/build-availability-windows.service';
import { AvailabilityExceptionRepository } from '@modules/availability/repositories/availability-exception.repository';
import { AvailabilitySlotRepository } from '@modules/availability/repositories/availability-slot.repository';
import { ResolvePractitionerTimezoneService } from '@modules/availability/services/resolve-practitioner-timezone.service';

@Injectable()
export class ValidateSessionScheduleCompatibilityService {
  constructor(
    private readonly availabilitySlotRepository: AvailabilitySlotRepository,
    private readonly availabilityExceptionRepository: AvailabilityExceptionRepository,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
    private readonly buildAvailabilityWindowsService: BuildAvailabilityWindowsService,
  ) {}

  async assertFitsPractitionerAvailability(input: {
    practitionerId: string;
    practitionerTimezone: string | null;
    requestedStartAtUtc: Date;
    requestedEndAtUtc: Date;
    requestedDurationMinutes: 30 | 60;
  }): Promise<{ timezone: string }> {
    const [weeklySlots, exceptions] = await Promise.all([
      this.availabilitySlotRepository.listActiveByPractitioner(
        input.practitionerId,
      ),
      this.availabilityExceptionRepository.listActiveForRange(
        input.practitionerId,
        input.requestedStartAtUtc,
        input.requestedEndAtUtc,
      ),
    ]);

    const timezone = this.resolvePractitionerTimezoneService.resolve({
      weeklySlots,
      fallbackTimezone: input.practitionerTimezone,
    });
    const windows = this.buildAvailabilityWindowsService.buildForRange({
      timezone,
      weeklySlots,
      exceptions,
      fromUtc: input.requestedStartAtUtc,
      toUtc: input.requestedEndAtUtc,
    });

    const fitsWindow = windows.some(
      (window) =>
        window.startsAt <= input.requestedStartAtUtc.toISOString() &&
        window.endsAt >= input.requestedEndAtUtc.toISOString() &&
        (window.durationMinutes === null ||
          window.durationMinutes === input.requestedDurationMinutes),
    );

    if (!fitsWindow) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.unavailableTimeWindow',
        error: 'SESSION_UNAVAILABLE_TIME_WINDOW',
      });
    }

    return { timezone };
  }
}
