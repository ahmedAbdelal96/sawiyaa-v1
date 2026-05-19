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
import { AvailabilitySlotRepository } from '../repositories/availability-slot.repository';
import { BuildAvailabilityWindowsService } from '../services/build-availability-windows.service';
import { ResolvePractitionerTimezoneService } from '../services/resolve-practitioner-timezone.service';

const PUBLIC_AVAILABILITY_BLOCKING_SESSION_STATUSES: SessionStatus[] = [
  SessionStatus.PENDING_PRACTITIONER_RESPONSE,
  SessionStatus.CONFIRMED,
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
  SessionStatus.IN_PROGRESS,
];

/**
 * Public window listing is the main booking-facing read baseline for Phase 2.
 * It returns derived UTC windows only and leaves reservation/session orchestration to later modules.
 */
@Injectable()
export class ListPublicPractitionerAvailabilityWindowsUseCase {
  private readonly maximumRangeInDays = 31;

  constructor(
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilitySlotRepository: AvailabilitySlotRepository,
    private readonly availabilityExceptionRepository: AvailabilityExceptionRepository,
    private readonly resolvePractitionerTimezoneService: ResolvePractitionerTimezoneService,
    private readonly buildAvailabilityWindowsService: BuildAvailabilityWindowsService,
    private readonly publicPractitionerVisibilityPolicy: PublicPractitionerVisibilityPolicy,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: { slug: string; fromUtc: Date; toUtc: Date }) {
    if (input.toUtc.getTime() <= input.fromUtc.getTime()) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidRange',
        error: 'AVAILABILITY_INVALID_RANGE',
      });
    }

    const rangeDays =
      (input.toUtc.getTime() - input.fromUtc.getTime()) / (1000 * 60 * 60 * 24);

    if (rangeDays > this.maximumRangeInDays) {
      throw new BadRequestException({
        messageKey: 'availability.errors.rangeTooLarge',
        error: 'AVAILABILITY_RANGE_TOO_LARGE',
        messageParams: {
          maxDays: this.maximumRangeInDays,
        },
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

    const [weeklySlots, exceptions, bookedSessions] = await Promise.all([
      this.availabilitySlotRepository.listActiveByPractitioner(practitioner.id),
      this.availabilityExceptionRepository.listActiveForRange(
        practitioner.id,
        input.fromUtc,
        input.toUtc,
      ),
      this.prisma.session.findMany({
        where: {
          practitionerId: practitioner.id,
          OR: [
            {
              status: {
                in: PUBLIC_AVAILABILITY_BLOCKING_SESSION_STATUSES,
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
            lt: input.toUtc,
          },
          scheduledEndAt: {
            gt: input.fromUtc,
          },
        },
        select: {
          scheduledStartAt: true,
          scheduledEndAt: true,
        },
      }),
    ]);

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
      weeklySlots,
      fallbackTimezone: practitioner.user.timezone,
    });
    const windows = this.buildAvailabilityWindowsService.buildForRange({
      timezone,
      weeklySlots,
      exceptions,
      bookedSessions: bookedSessions.map((session) => ({
        startsAt: session.scheduledStartAt!,
        endsAt: session.scheduledEndAt!,
      })),
      fromUtc: input.fromUtc,
      toUtc: input.toUtc,
    });

    return {
      timezone,
      range: {
        from: input.fromUtc.toISOString(),
        to: input.toUtc.toISOString(),
      },
      windows,
    };
  }
}
