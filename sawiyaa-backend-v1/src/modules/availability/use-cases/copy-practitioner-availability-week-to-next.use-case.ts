import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import {
  PractitionerAvailabilityWeekRepository,
  PractitionerAvailabilityWeekWithSlots,
} from '../repositories/practitioner-availability-week.repository';
import { AvailabilityWeekMapper } from '../mappers/availability-week.mapper';
import { AvailabilityWeekCalendarService } from '../services/availability-week-calendar.service';
import { AvailabilityWeekOverviewService } from '../services/availability-week-overview.service';
import { ValidateAvailabilityOverlapService } from '../services/validate-availability-overlap.service';
@Injectable()
export class CopyPractitionerAvailabilityWeekToNextUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityWeekRepository: PractitionerAvailabilityWeekRepository,
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
    weekId: string;
  }) {
    const practitioner =
      await this.availabilityPractitionerRepository.findByUserId(input.userId);

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'availability.errors.practitionerNotFound',
        errorCode: 'AVAILABILITY_PRACTITIONER_NOT_FOUND',
      });
    }

    const source = await this.availabilityWeekRepository.findByIdForPractitioner(
      practitioner.id,
      input.weekId,
    );

    if (!source) {
      throw new NotFoundException({
        messageKey: 'availability.errors.weekNotFound',
        errorCode: 'AVAILABILITY_WEEK_NOT_FOUND',
      });
    }

    if (source.status === AvailabilityWeekStatus.ARCHIVED) {
      throw new ConflictException({
        messageKey: 'availability.errors.weekNotDraft',
        errorCode: 'AVAILABILITY_WEEK_NOT_DRAFT',
      });
    }

    const nextWeekStartDate = new Date(
      source.weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    const nextWeekRange = this.availabilityWeekCalendarService.resolveWeekWindowFromStartDate(
      {
        weekStartDate: nextWeekStartDate.toISOString().slice(0, 10),
      },
    );

    const normalizedSlots = this.validateAvailabilityOverlapService.validateWeeklySlots(
      source.slots.map((slot) => ({
        dayOfWeek: this.toDayOfWeek(slot.weekday),
        durationMinutes: slot.durationMinutes as 30 | 60,
        startMinuteOfDay: slot.startMinuteOfDay,
        endMinuteOfDay: slot.endMinuteOfDay,
      })),
    );

    const existingTarget =
      await this.availabilityWeekRepository.findByPractitionerAndWeekStartDate(
        practitioner.id,
        nextWeekRange.startDate,
      );

    let targetWeek: PractitionerAvailabilityWeekWithSlots;

    if (!existingTarget) {
      targetWeek = await this.availabilityWeekRepository.createDraftWeek({
        practitionerId: practitioner.id,
        weekStartDate: nextWeekRange.startDate,
        weekEndDate: nextWeekRange.endDate,
        timezone: source.timezone,
        status: AvailabilityWeekStatus.DRAFT,
        copiedFromWeekId: source.id,
        slots: normalizedSlots.map((slot) => ({
          weekday: this.toWeekday(slot.dayOfWeek),
          startMinuteOfDay: slot.startMinuteOfDay,
          endMinuteOfDay: slot.endMinuteOfDay,
          durationMinutes: slot.durationMinutes,
          timezone: source.timezone,
        })),
      });
    } else if (existingTarget.status !== AvailabilityWeekStatus.DRAFT) {
      throw new ConflictException({
        messageKey: 'availability.errors.weekAlreadyExists',
        errorCode: 'AVAILABILITY_WEEK_ALREADY_EXISTS',
      });
    } else {
      targetWeek = await this.prisma.$transaction(async (tx) => {
        await this.availabilityWeekRepository.updateWeek(
          existingTarget.id,
          {
            timezone: source.timezone,
            status: AvailabilityWeekStatus.DRAFT,
            copiedFromWeekId: source.id,
          },
          tx,
        );

        return this.availabilityWeekRepository.updateDraftWeekSlots(
          existingTarget.id,
          source.timezone,
          normalizedSlots.map((slot) => ({
            weekday: this.toWeekday(slot.dayOfWeek),
            startMinuteOfDay: slot.startMinuteOfDay,
            endMinuteOfDay: slot.endMinuteOfDay,
            durationMinutes: slot.durationMinutes,
          })),
          tx,
        );
      });
    }

    const overview = await this.availabilityWeekOverviewService.buildForPractitioner(
      {
        practitionerId: practitioner.id,
        timezone: source.timezone,
      },
    );

      return {
        message: this.i18nService.t(
          'availability.success.weekCopied',
          input.locale,
        ),
      week: this.availabilityWeekMapper.toWeek({
        week: targetWeek,
        weekStartDate: nextWeekRange.startDate,
        weekEndDate: nextWeekRange.endDate,
        timezone: source.timezone,
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
