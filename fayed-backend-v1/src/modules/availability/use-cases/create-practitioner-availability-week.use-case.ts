import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';
import { assertIanaTimeZoneInput } from '@common/utils/timezone.util';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import {
  PractitionerAvailabilityWeekRepository,
  PractitionerAvailabilityWeekWithSlots,
} from '../repositories/practitioner-availability-week.repository';
import { AvailabilityWeekMapper } from '../mappers/availability-week.mapper';
import { AvailabilityWeekCalendarService } from '../services/availability-week-calendar.service';
import { AvailabilityWeekOverviewService } from '../services/availability-week-overview.service';
import { ValidateAvailabilityOverlapService } from '../services/validate-availability-overlap.service';
import {
  isAvailabilityWeekUniqueConstraintError,
  toAvailabilityWeekConflictException,
} from '../utils/availability-week-conflict.util';

@Injectable()
export class CreatePractitionerAvailabilityWeekUseCase {
  constructor(
    private readonly prismaWeekRepository: PractitionerAvailabilityWeekRepository,
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilityWeekCalendarService: AvailabilityWeekCalendarService,
    private readonly availabilityWeekOverviewService: AvailabilityWeekOverviewService,
    private readonly availabilityWeekMapper: AvailabilityWeekMapper,
    private readonly validateAvailabilityOverlapService: ValidateAvailabilityOverlapService,
    private readonly i18nService: I18nService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    weekStartDate: string;
    timezone: string;
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

    const normalizedTimezone = assertIanaTimeZoneInput(input.timezone, {
      messageKey: 'availability.errors.invalidTimezone',
      error: 'AVAILABILITY_INVALID_TIMEZONE',
    });
    const range = this.availabilityWeekCalendarService.resolveWeekWindowFromStartDate(
      {
        weekStartDate: input.weekStartDate,
      },
    );

    const normalizedSlots = this.validateAvailabilityOverlapService.validateWeeklySlots(
      (input.slots ?? []).map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        durationMinutes: slot.durationMinutes,
        startMinuteOfDay: slot.startMinuteOfDay,
        endMinuteOfDay: slot.endMinuteOfDay,
      })),
    );

    const existing =
      await this.prismaWeekRepository.findByPractitionerAndWeekStartDate(
        practitioner.id,
        range.startDate,
      );

    if (existing) {
      throw new ConflictException({
        messageKey: 'availability.errors.weekAlreadyExists',
        errorCode: 'AVAILABILITY_WEEK_ALREADY_EXISTS',
      });
    }

    try {
      const created = await this.prismaWeekRepository.createDraftWeek({
        practitionerId: practitioner.id,
        weekStartDate: range.startDate,
        weekEndDate: range.endDate,
        timezone: normalizedTimezone,
        status: AvailabilityWeekStatus.DRAFT,
        slots: normalizedSlots.map((slot) => ({
          weekday: this.toWeekday(slot.dayOfWeek),
          startMinuteOfDay: slot.startMinuteOfDay,
          endMinuteOfDay: slot.endMinuteOfDay,
          durationMinutes: slot.durationMinutes,
          timezone: normalizedTimezone,
        })),
      });

      const overview =
        await this.availabilityWeekOverviewService.buildForPractitioner(
        {
          practitionerId: practitioner.id,
          timezone: normalizedTimezone,
        },
      );

      return {
        message: this.i18nService.t(
          'availability.success.weekCreated',
          input.locale,
        ),
        week: this.availabilityWeekMapper.toWeek({
          week: created,
          weekStartDate: range.startDate,
          weekEndDate: range.endDate,
          timezone: normalizedTimezone,
        }),
        ...overview,
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        const conflict = toAvailabilityWeekConflictException(error);
        if (conflict) {
          throw conflict;
        }
      }

      if (isAvailabilityWeekUniqueConstraintError(error)) {
        const conflict = toAvailabilityWeekConflictException(error);
        if (conflict) {
          throw conflict;
        }
      }

      throw error;
    }
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
