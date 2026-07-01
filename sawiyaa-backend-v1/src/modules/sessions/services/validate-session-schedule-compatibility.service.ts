import { BadRequestException, Injectable } from '@nestjs/common';
import { AvailabilityExceptionRepository } from '@modules/availability/repositories/availability-exception.repository';
import { PractitionerAvailabilityWeekRepository } from '@modules/availability/repositories/practitioner-availability-week.repository';
import { BuildPublishedWeekAvailabilityWindowsService } from '@modules/availability/services/build-published-week-availability-windows.service';
import { AvailabilityWeekCalendarService } from '@modules/availability/services/availability-week-calendar.service';
import { ResolvePractitionerTimezoneService } from '@modules/availability/services/resolve-practitioner-timezone.service';
import { SessionRepository } from '../repositories/session.repository';

@Injectable()
export class ValidateSessionScheduleCompatibilityService {
  constructor(
    private readonly practitionerAvailabilityWeekRepository: PractitionerAvailabilityWeekRepository,
    private readonly availabilityExceptionRepository: AvailabilityExceptionRepository,
    private readonly availabilityWeekCalendarService: AvailabilityWeekCalendarService,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
    private readonly buildPublishedWeekAvailabilityWindowsService: BuildPublishedWeekAvailabilityWindowsService,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async assertFitsPractitionerAvailability(input: {
    practitionerId: string;
    practitionerTimezone: string | null;
    requestedStartAtUtc: Date;
    requestedEndAtUtc: Date;
    requestedDurationMinutes: 30 | 60;
  }): Promise<{ timezone: string }> {
    const timezone = this.resolvePractitionerTimezoneService.resolve({
      fallbackTimezone: input.practitionerTimezone,
    });
    const weekWindow =
      this.availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow({
        timezone,
      });

    if (
      input.requestedStartAtUtc < weekWindow.currentWeek.startDate ||
      input.requestedEndAtUtc > weekWindow.nextWeek.endDate
    ) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.unavailableTimeWindow',
        error: 'SESSION_UNAVAILABLE_TIME_WINDOW',
      });
    }

    const [publishedWeeks, exceptions, bookedSessions] = await Promise.all([
      this.practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts(
        input.practitionerId,
        [weekWindow.currentWeek.startDate, weekWindow.nextWeek.startDate],
      ),
      this.availabilityExceptionRepository.listActiveForRange(
        input.practitionerId,
        input.requestedStartAtUtc,
        input.requestedEndAtUtc,
      ),
      this.sessionRepository.listBlockingSessionRangesInRangeForPractitioner(
        input.practitionerId,
        input.requestedEndAtUtc,
        input.requestedStartAtUtc,
      ),
    ]);

    const windows = this.buildPublishedWeekAvailabilityWindowsService.buildForRange(
      {
        timezone,
        weeks: publishedWeeks,
        exceptions,
        bookedSessions: bookedSessions.map((session) => ({
          startsAt: session.scheduledStartAt!,
          endsAt: session.scheduledEndAt!,
        })),
        fromUtc: input.requestedStartAtUtc,
        toUtc: input.requestedEndAtUtc,
        now: new Date(),
      },
    );

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
