import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { assertIanaTimeZoneInput } from '@common/utils/timezone.util';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import {
  PractitionerAvailabilityWeekRepository,
  PractitionerAvailabilityWeekWithSlots,
} from '../repositories/practitioner-availability-week.repository';
import { AvailabilityWeekMapper } from '../mappers/availability-week.mapper';
import { AvailabilityWeekOverviewService } from '../services/availability-week-overview.service';
import { ValidateAvailabilityOverlapService } from '../services/validate-availability-overlap.service';
@Injectable()
export class UpdatePractitionerAvailabilityWeekUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityWeekRepository: PractitionerAvailabilityWeekRepository,
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilityWeekOverviewService: AvailabilityWeekOverviewService,
    private readonly availabilityWeekMapper: AvailabilityWeekMapper,
    private readonly validateAvailabilityOverlapService: ValidateAvailabilityOverlapService,
    private readonly i18nService: I18nService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    weekId: string;
    timezone?: string;
    slots?: Array<{
      dayOfWeek: number;
      durationMinutes?: 30 | 60;
      startMinuteOfDay: number;
      endMinuteOfDay: number;
    }>;
  }) {
    const practitioner =
      await this.availabilityPractitionerRepository.findByUserId(input.userId);

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'availability.errors.practitionerNotFound',
        errorCode: 'AVAILABILITY_PRACTITIONER_NOT_FOUND',
      });
    }

    const existing = await this.availabilityWeekRepository.findByIdForPractitioner(
      practitioner.id,
      input.weekId,
    );

    if (!existing) {
      throw new NotFoundException({
        messageKey: 'availability.errors.weekNotFound',
        errorCode: 'AVAILABILITY_WEEK_NOT_FOUND',
      });
    }

    if (existing.status !== AvailabilityWeekStatus.DRAFT) {
      throw new ConflictException({
        messageKey: 'availability.errors.weekNotDraft',
        errorCode: 'AVAILABILITY_WEEK_NOT_DRAFT',
      });
    }

    const timezone =
      input.timezone === undefined
        ? existing.timezone
        : assertIanaTimeZoneInput(input.timezone, {
            messageKey: 'availability.errors.invalidTimezone',
            error: 'AVAILABILITY_INVALID_TIMEZONE',
          });

    const normalizedSlots =
      input.slots === undefined
        ? existing.slots.map((slot) => ({
            dayOfWeek: this.toDayOfWeek(slot.weekday),
            durationMinutes: slot.durationMinutes as 30 | 60,
            startMinuteOfDay: slot.startMinuteOfDay,
            endMinuteOfDay: slot.endMinuteOfDay,
          }))
        : this.validateAvailabilityOverlapService.validateWeeklySlots(
            input.slots.map((slot) => ({
              dayOfWeek: slot.dayOfWeek,
              durationMinutes: slot.durationMinutes,
              startMinuteOfDay: slot.startMinuteOfDay,
              endMinuteOfDay: slot.endMinuteOfDay,
            })),
          );

    const refreshedWeek = await this.prisma.$transaction(async (tx) => {
      await this.availabilityWeekRepository.updateWeek(
        existing.id,
        {
          timezone,
        },
        tx,
      );

      if (input.slots === undefined) {
        await this.availabilityWeekRepository.syncWeekSlotsTimezone(
          existing.id,
          timezone,
          tx,
        );

        return this.availabilityWeekRepository.findByIdForPractitioner(
          practitioner.id,
          existing.id,
          tx,
        );
      }

      return this.availabilityWeekRepository.updateDraftWeekSlots(
        existing.id,
        timezone,
        normalizedSlots.map((slot) => ({
          weekday: this.toWeekday(slot.dayOfWeek),
          startMinuteOfDay: slot.startMinuteOfDay,
          endMinuteOfDay: slot.endMinuteOfDay,
          durationMinutes: slot.durationMinutes,
        })),
        tx,
      );
    });

    const overview = await this.availabilityWeekOverviewService.buildForPractitioner(
      {
        practitionerId: practitioner.id,
        timezone,
      },
    );

      return {
        message: this.i18nService.t(
          'availability.success.weekUpdated',
          input.locale,
        ),
      week: this.availabilityWeekMapper.toWeek({
        week: refreshedWeek as PractitionerAvailabilityWeekWithSlots,
        weekStartDate: existing.weekStartDate,
        weekEndDate: existing.weekEndDate,
        timezone,
      }),
      ...overview,
    };
  }

  private toDayOfWeek(weekday: AvailabilityWeekday): number {
    const weekdays: AvailabilityWeekday[] = [
      AvailabilityWeekday.SUNDAY,
      AvailabilityWeekday.MONDAY,
      AvailabilityWeekday.TUESDAY,
      AvailabilityWeekday.WEDNESDAY,
      AvailabilityWeekday.THURSDAY,
      AvailabilityWeekday.FRIDAY,
      AvailabilityWeekday.SATURDAY,
    ];

    return weekdays.indexOf(weekday);
  }

  private toWeekday(dayOfWeek: number): AvailabilityWeekday {
    const weekdays: AvailabilityWeekday[] = [
      AvailabilityWeekday.SUNDAY,
      AvailabilityWeekday.MONDAY,
      AvailabilityWeekday.TUESDAY,
      AvailabilityWeekday.WEDNESDAY,
      AvailabilityWeekday.THURSDAY,
      AvailabilityWeekday.FRIDAY,
      AvailabilityWeekday.SATURDAY,
    ];

    return weekdays[dayOfWeek];
  }
}
