import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AvailabilityWeekStatus, AvailabilityWeekday, SessionStatus } from '@prisma/client';
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
import { AvailabilityWeekCalendarService } from '../services/availability-week-calendar.service';
import { AvailabilitySlotEditabilityService } from '../services/availability-slot-editability.service';
import { BLOCKING_SESSION_STATUSES } from '../utils/availability-session.constants';
import {
  getCalendarDateParts,
  addDaysToCalendarDate,
  zonedDateTimeToUtc,
} from '../utils/availability-timezone.util';
import { WEEKDAY_ENUM_TO_INDEX } from '../utils/availability-weekday.util';

@Injectable()
export class UpdatePractitionerAvailabilityWeekUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityWeekRepository: PractitionerAvailabilityWeekRepository,
    private readonly availabilityPractitionerRepository: AvailabilityPractitionerRepository,
    private readonly availabilityWeekOverviewService: AvailabilityWeekOverviewService,
    private readonly availabilityWeekMapper: AvailabilityWeekMapper,
    private readonly validateAvailabilityOverlapService: ValidateAvailabilityOverlapService,
    private readonly availabilityWeekCalendarService: AvailabilityWeekCalendarService,
    private readonly availabilitySlotEditabilityService: AvailabilitySlotEditabilityService,
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

    if (
      existing.status !== AvailabilityWeekStatus.DRAFT &&
      existing.status !== AvailabilityWeekStatus.PUBLISHED
    ) {
      throw new ConflictException({
        messageKey: 'availability.errors.weekNotEditable',
        errorCode: 'AVAILABILITY_WEEK_NOT_EDITABLE',
      });
    }

    const timezone =
      input.timezone === undefined
        ? existing.timezone
        : assertIanaTimeZoneInput(input.timezone, {
            messageKey: 'availability.errors.invalidTimezone',
            error: 'AVAILABILITY_INVALID_TIMEZONE',
          });

    const isPublished = existing.status === AvailabilityWeekStatus.PUBLISHED;

    if (isPublished) {
      if (input.timezone !== undefined && input.timezone !== existing.timezone) {
        throw new ConflictException({
          messageKey: 'availability.errors.publishedTimezoneLocked',
          errorCode: 'AVAILABILITY_PUBLISHED_TIMEZONE_LOCKED',
        });
      }
    }

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

    const { currentWeek, nextWeek } =
      this.availabilityWeekCalendarService.resolveCurrentAndNextWeekWindow({
        timezone: existing.timezone,
      });

    const isCurrentWeek =
      existing.weekStartDate.getTime() === currentWeek.startDate.getTime();
    const weekWindow = isCurrentWeek ? currentWeek : nextWeek;

    const now = new Date();

    if (isPublished && input.slots !== undefined) {
      const editabilityMap =
        await this.availabilitySlotEditabilityService.calculateEditability({
          practitionerId: practitioner.id,
          weekStartDate: weekWindow.startDate,
          weekEndDate: weekWindow.endDate,
          timezone: existing.timezone,
          slots: existing.slots,
          now,
        });

      const inputSignatures = new Set(
        input.slots.map(
          (s) =>
            `${s.dayOfWeek}_${s.durationMinutes ?? 30}_${s.startMinuteOfDay}_${s.endMinuteOfDay}`,
        ),
      );

      for (const slot of existing.slots) {
        const baseDayIndex = WEEKDAY_ENUM_TO_INDEX[slot.weekday];
        const sig = `${baseDayIndex}_${slot.durationMinutes}_${slot.startMinuteOfDay}_${slot.endMinuteOfDay}`;
        const meta = editabilityMap.get(sig);
        if (meta && (!meta.canEdit || !meta.canRemove)) {
          if (!inputSignatures.has(sig)) {
            const errorCode =
              meta.reasonCode === 'PAST'
                ? 'AVAILABILITY_SLOT_IN_PAST'
                : 'AVAILABILITY_SLOT_BOOKED';
            throw new ConflictException({
              messageKey:
                meta.reasonCode === 'PAST'
                  ? 'availability.errors.slotInPast'
                  : 'availability.errors.slotBooked',
              errorCode,
            });
          }
        }
      }

      const existingSignatures = new Set(
        existing.slots.map(
          (s) =>
            `${WEEKDAY_ENUM_TO_INDEX[s.weekday]}_${s.durationMinutes}_${s.startMinuteOfDay}_${s.endMinuteOfDay}`,
        ),
      );

      for (const slot of input.slots) {
        const durationMinutes = slot.durationMinutes ?? 30;
        const sig = `${slot.dayOfWeek}_${durationMinutes}_${slot.startMinuteOfDay}_${slot.endMinuteOfDay}`;
        if (!existingSignatures.has(sig)) {
          const weekStartParts = getCalendarDateParts(weekWindow.startDate, 'UTC');
          const localDate = addDaysToCalendarDate(weekStartParts, slot.dayOfWeek);
          const startsAt = zonedDateTimeToUtc(
            {
              ...localDate,
              hour: Math.floor(slot.startMinuteOfDay / 60),
              minute: slot.startMinuteOfDay % 60,
            },
            existing.timezone,
          );
          const endsAt = zonedDateTimeToUtc(
            {
              ...localDate,
              hour: Math.floor(slot.endMinuteOfDay / 60),
              minute: slot.endMinuteOfDay % 60,
            },
            existing.timezone,
          );

          if (startsAt.getTime() < now.getTime()) {
            throw new ConflictException({
              messageKey: 'availability.errors.slotInPast',
              errorCode: 'AVAILABILITY_SLOT_IN_PAST',
            });
          }

          const conflict = await this.prisma.session.findFirst({
            where: {
              practitionerId: practitioner.id,
              scheduledStartAt: {
                lt: endsAt,
              },
              scheduledEndAt: {
                gt: startsAt,
              },
              OR: [
                {
                  status: {
                    in: BLOCKING_SESSION_STATUSES,
                  },
                },
                {
                  status: SessionStatus.PENDING_PAYMENT,
                  expiresAt: {
                    gt: now,
                  },
                },
              ],
            },
          });

          if (conflict) {
            throw new ConflictException({
              messageKey: 'sessions.errors.practitionerTimeConflict',
              errorCode: 'SESSION_PRACTITIONER_TIME_CONFLICT',
            });
          }
        }
      }
    }

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

    if (!refreshedWeek) {
      throw new NotFoundException({
        messageKey: 'availability.errors.weekNotFound',
        errorCode: 'AVAILABILITY_WEEK_NOT_FOUND',
      });
    }

    const updatedEditabilityMap =
      await this.availabilitySlotEditabilityService.calculateEditability({
        practitionerId: practitioner.id,
        weekStartDate: weekWindow.startDate,
        weekEndDate: weekWindow.endDate,
        timezone,
        slots: refreshedWeek.slots,
        now,
      });

    const overview = await this.availabilityWeekOverviewService.buildForPractitioner({
      practitionerId: practitioner.id,
      timezone,
    });

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
        editabilityMap: updatedEditabilityMap,
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
