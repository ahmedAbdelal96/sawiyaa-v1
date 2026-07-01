import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PresenceStatus,
  PractitionerStatus,
  SessionMode,
  UserStatus,
} from '@prisma/client';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { PractitionerPresenceRepository } from '@modules/presence/repositories/practitioner-presence.repository';
import { resolveEffectivePresenceStatus } from '@modules/presence/utils/presence-liveness';
import { AvailabilityExceptionRepository } from '@modules/availability/repositories/availability-exception.repository';
import { PractitionerAvailabilityWeekRepository } from '@modules/availability/repositories/practitioner-availability-week.repository';
import { BuildPublishedWeekAvailabilityWindowsService } from '@modules/availability/services/build-published-week-availability-windows.service';
import { AvailabilityWeekCalendarService } from '@modules/availability/services/availability-week-calendar.service';
import { ResolvePractitionerTimezoneService } from '@modules/availability/services/resolve-practitioner-timezone.service';
import { ValidateSessionConflictsService } from '@modules/sessions/services/validate-session-conflicts.service';
import { ValidateSessionDurationService } from '@modules/sessions/services/validate-session-duration.service';
import { SessionRepository } from '@modules/sessions/repositories/session.repository';

/**
 * Instant booking eligibility composes visibility, presence, published-week availability, and conflict checks.
 * It intentionally does not mutate presence or create sessions by itself.
 */
@Injectable()
export class ValidateInstantBookingEligibilityService {
  constructor(
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly practitionerPresenceRepository: PractitionerPresenceRepository,
    private readonly practitionerAvailabilityWeekRepository: PractitionerAvailabilityWeekRepository,
    private readonly availabilityExceptionRepository: AvailabilityExceptionRepository,
    private readonly availabilityWeekCalendarService: AvailabilityWeekCalendarService,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
    private readonly buildPublishedWeekAvailabilityWindowsService: BuildPublishedWeekAvailabilityWindowsService,
    private readonly sessionRepository: SessionRepository,
    private readonly validateSessionDurationService: ValidateSessionDurationService,
    private readonly validateSessionConflictsService: ValidateSessionConflictsService,
  ) {}

  async assertPractitionerCanReceiveInstantBooking(input: {
    practitioner: {
      id: string;
      status: any;
      isPublicProfilePublished: boolean;
      publicSlug: string;
      professionalTitle: string | null;
      bio: string | null;
      user: {
        status: any;
        displayName: string | null;
        timezone: string | null;
      };
      specialties: Array<{ specialtyId: string }>;
    };
    durationMinutes: number;
    sessionMode: SessionMode;
    nowUtc: Date;
  }): Promise<{ startsAtUtc: Date; endsAtUtc: Date; timezone: string }> {
    this.validateSessionDurationService.validate(input.durationMinutes);

    if (
      input.sessionMode !== SessionMode.VIDEO &&
      input.sessionMode !== SessionMode.AUDIO
    ) {
      throw new BadRequestException({
        messageKey: 'instantBooking.errors.invalidSessionMode',
        error: 'INSTANT_BOOKING_INVALID_SESSION_MODE',
      });
    }

    const visibility = this.publicPractitionerVisibilityPolicy.evaluate({
      practitionerStatus: input.practitioner.status as PractitionerStatus,
      userStatus: input.practitioner.user.status as UserStatus,
      isPublicProfilePublished: input.practitioner.isPublicProfilePublished,
      hasPublicSlug: Boolean(input.practitioner.publicSlug?.trim()),
      hasDisplayName: Boolean(input.practitioner.user.displayName?.trim()),
      hasProfessionalTitle: Boolean(
        input.practitioner.professionalTitle?.trim(),
      ),
      hasBio: Boolean(input.practitioner.bio?.trim()),
      hasAtLeastOneActiveSpecialty: input.practitioner.specialties.length > 0,
    });

    if (!visibility.isVisible) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.practitionerNotEligible',
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_ELIGIBLE',
      });
    }

    const presence =
      await this.practitionerPresenceRepository.createOrGetByPractitionerProfileId(
        input.practitioner.id,
      );
    const effectivePresenceStatus = resolveEffectivePresenceStatus(
      presence,
      input.nowUtc,
    );

    if (effectivePresenceStatus === PresenceStatus.BUSY) {
      throw new ConflictException({
        messageKey: 'instantBooking.errors.practitionerBusy',
        error: 'INSTANT_BOOKING_PRACTITIONER_BUSY',
      });
    }

    if (effectivePresenceStatus !== PresenceStatus.ONLINE) {
      throw new BadRequestException({
        messageKey: 'instantBooking.errors.practitionerNotOnline',
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_ONLINE',
      });
    }

    if (!presence.isInstantBookingEnabled) {
      throw new BadRequestException({
        messageKey: 'instantBooking.errors.instantBookingDisabled',
        error: 'INSTANT_BOOKING_DISABLED',
      });
    }

    const endsAtUtc = new Date(
      input.nowUtc.getTime() + input.durationMinutes * 60 * 1000,
    );

    const timezone = this.resolvePractitionerTimezoneService.resolve({
      fallbackTimezone: input.practitioner.user.timezone,
    });
    const weekWindow =
      this.availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow({
        timezone,
        now: input.nowUtc,
      });

    if (
      input.nowUtc < weekWindow.currentWeek.startDate ||
      endsAtUtc > weekWindow.nextWeek.endDate
    ) {
      throw new BadRequestException({
        messageKey: 'instantBooking.errors.practitionerNotAvailableNow',
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW',
      });
    }

    const [publishedWeeks, exceptions, bookedSessions] = await Promise.all([
      this.practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts(
        input.practitioner.id,
        [weekWindow.currentWeek.startDate, weekWindow.nextWeek.startDate],
      ),
      this.availabilityExceptionRepository.listActiveForRange(
        input.practitioner.id,
        input.nowUtc,
        endsAtUtc,
      ),
      this.sessionRepository.listBlockingSessionRangesInRangeForPractitioner(
        input.practitioner.id,
        endsAtUtc,
        input.nowUtc,
        input.nowUtc,
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
        fromUtc: input.nowUtc,
        toUtc: endsAtUtc,
        now: input.nowUtc,
      },
    );

    const fitsWindow = windows.some(
      (window) =>
        Date.parse(window.startsAt) <= input.nowUtc.getTime() &&
        Date.parse(window.endsAt) >= endsAtUtc.getTime(),
    );

    if (!fitsWindow) {
      throw new BadRequestException({
        messageKey: 'instantBooking.errors.practitionerNotAvailableNow',
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_AVAILABLE_NOW',
      });
    }

    await this.validateSessionConflictsService.assertNoPractitionerConflict({
      practitionerId: input.practitioner.id,
      scheduledStartAtUtc: input.nowUtc,
      scheduledEndAtUtc: endsAtUtc,
    });

    return {
      startsAtUtc: input.nowUtc,
      endsAtUtc,
      timezone,
    };
  }
}
