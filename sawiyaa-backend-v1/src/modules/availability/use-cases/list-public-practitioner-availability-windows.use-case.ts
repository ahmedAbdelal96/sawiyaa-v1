import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionStatus } from '@prisma/client';
import { PublicPractitionerVisibilityPolicy } from '@modules/practitioners/policies/public-practitioner-visibility.policy';
import { AvailabilityExceptionRepository } from '../repositories/availability-exception.repository';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { PractitionerAvailabilityWeekRepository } from '../repositories/practitioner-availability-week.repository';
import { BuildPublishedWeekAvailabilityWindowsService } from '../services/build-published-week-availability-windows.service';
import { AvailabilityWeekCalendarService } from '../services/availability-week-calendar.service';
import { ResolvePractitionerTimezoneService } from '../services/resolve-practitioner-timezone.service';

import { BLOCKING_SESSION_STATUSES } from '../utils/availability-session.constants';

/**
 * Public window listing is the booking-facing read baseline for Phase 1B-A.
 * It returns published-week UTC windows only and keeps legacy recurring slots
 * out of the public patient contract.
 */
@Injectable()
export class ListPublicPractitionerAvailabilityWindowsUseCase {
  constructor(
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly practitionerAvailabilityWeekRepository: PractitionerAvailabilityWeekRepository,
    private readonly availabilityExceptionRepository: AvailabilityExceptionRepository,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
    private readonly availabilityWeekCalendarService: AvailabilityWeekCalendarService,
    private readonly buildPublishedWeekAvailabilityWindowsService: BuildPublishedWeekAvailabilityWindowsService,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: {
    slug: string;
    fromUtc: Date;
    toUtc: Date;
    includeBooked?: boolean;
  }) {
    if (input.toUtc.getTime() <= input.fromUtc.getTime()) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidRange',
        error: 'AVAILABILITY_INVALID_RANGE',
      });
    }

    const practitioner =
      await this.availabilityPractitionerRepository.findByPublicSlug(
        input.slug,
      );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'availability.errors.publicAvailabilityNotFound',
        error: 'PUBLIC_AVAILABILITY_NOT_FOUND',
      });
    }

    const visibility = this.publicPractitionerVisibilityPolicy.evaluate({
      practitionerStatus: practitioner.status,
      userStatus: practitioner.user.status,
      isPublicProfilePublished: practitioner.isPublicProfilePublished,
      hasPublicSlug: Boolean(practitioner.publicSlug?.trim()),
      hasDisplayName: Boolean(practitioner.user.displayName?.trim()),
      hasProfessionalTitle: Boolean(practitioner.professionalTitle?.trim()),
      hasBio: Boolean(practitioner.bio?.trim()),
      hasAtLeastOneActiveSpecialty: practitioner.specialties.length > 0,
    });

    if (!visibility.isVisible) {
      throw new NotFoundException({
        messageKey: 'availability.errors.publicAvailabilityNotFound',
        error: 'PUBLIC_AVAILABILITY_NOT_VISIBLE',
      });
    }

    const timezone = this.resolvePractitionerTimezoneService.resolve({
      fallbackTimezone: practitioner.user.timezone,
    });
    const weekWindow =
      this.availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow({
        timezone,
      });
    const effectiveFrom = new Date(
      Math.max(
        input.fromUtc.getTime(),
        weekWindow.currentWeek.startDate.getTime(),
      ),
    );
    const effectiveTo = new Date(
      Math.min(input.toUtc.getTime(), weekWindow.nextWeek.endDate.getTime()),
    );

    if (effectiveTo.getTime() <= effectiveFrom.getTime()) {
      return {
        timezone,
        range: {
          from: input.fromUtc.toISOString(),
          to: input.toUtc.toISOString(),
        },
        windows: [],
        bookedSlots: input.includeBooked ? [] : undefined,
      };
    }

    const [publishedWeeks, exceptions, bookedSessions] = await Promise.all([
      this.practitionerAvailabilityWeekRepository.findPublishedByPractitionerAndWeekStarts(
        practitioner.id,
        [weekWindow.currentWeek.startDate, weekWindow.nextWeek.startDate],
      ),
      this.availabilityExceptionRepository.listActiveForRange(
        practitioner.id,
        effectiveFrom,
        effectiveTo,
      ),
      this.prisma.session.findMany({
        where: {
          practitionerId: practitioner.id,
          OR: [
            {
              status: {
                in: BLOCKING_SESSION_STATUSES,
              },
            },
            {
              status: SessionStatus.PENDING_PAYMENT,
              expiresAt: {
                gt: new Date(),
              },
            },
          ],
          scheduledStartAt: {
            lt: effectiveTo,
          },
          scheduledEndAt: {
            gt: effectiveFrom,
          },
        },
        select: {
          scheduledStartAt: true,
          scheduledEndAt: true,
          durationMinutes: true,
          status: true,
        },
      }),
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
        fromUtc: effectiveFrom,
        toUtc: effectiveTo,
        now: new Date(),
      },
    );

    const bookedSlots = bookedSessions
      .filter((session) => session.scheduledStartAt && session.scheduledEndAt)
      .map((session) => ({
        startsAt: session.scheduledStartAt!.toISOString(),
        endsAt: session.scheduledEndAt!.toISOString(),
        durationMinutes: session.durationMinutes ?? null,
        statusType:
          session.status === SessionStatus.PENDING_PAYMENT ||
          session.status === SessionStatus.PENDING_PRACTITIONER_RESPONSE
            ? ('RESERVED' as const)
            : ('BOOKED' as const),
      }))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() ||
          new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime(),
      );

    return {
      timezone,
      range: {
        from: input.fromUtc.toISOString(),
        to: input.toUtc.toISOString(),
      },
      windows,
      bookedSlots: input.includeBooked ? bookedSlots : undefined,
    };
  }
}
