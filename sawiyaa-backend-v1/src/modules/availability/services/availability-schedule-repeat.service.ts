import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AvailabilityScheduleRepeatOperationStatus,
  AvailabilityWeekStatus,
  Prisma,
  SessionStatus,
} from '@prisma/client';
import { createHash } from 'crypto';
import { assertIanaTimeZoneInput } from '@common/utils/timezone.util';
import { PrismaService } from '@common/prisma/prisma.service';
import { AvailabilityPractitionerRepository } from '../repositories/availability-practitioner.repository';
import { PractitionerAvailabilityWeekRepository } from '../repositories/practitioner-availability-week.repository';
import { AvailabilityWeekCalendarService, AvailabilityWeekDateRange } from './availability-week-calendar.service';
import { assertWeeklySlotsHaveValidLocalTimes } from '../utils/availability-local-time.util';
import { WEEKDAY_ENUM_TO_INDEX } from '../utils/availability-weekday.util';
import { DEFAULT_AVAILABILITY_REPEAT_PREVIEW_TTL_MINUTES } from '@config/availability.config';

export type RepeatReasonCode =
  | 'ELIGIBLE' | 'TARGET_ALREADY_EXISTS' | 'TARGET_PUBLISHED' | 'TARGET_HAS_BOOKINGS'
  | 'TARGET_CHANGED_SINCE_PREVIEW' | 'TARGET_OUT_OF_ACTIVE_RANGE' | 'TARGET_NOT_FUTURE'
  | 'TARGET_NOT_SUNDAY' | 'TARGET_EQUALS_SOURCE' | 'TARGET_DUPLICATED' | 'INVALID_TIMEZONE'
  | 'SOURCE_NOT_FOUND' | 'SOURCE_HAS_NO_SESSION_TIMES' | 'SOURCE_OUT_OF_ACTIVE_RANGE'
  | 'DST_INVALID_TIME' | 'DST_AMBIGUOUS_TIME' | 'SOURCE_CHANGED_SINCE_PREVIEW'
  | 'REPEAT_PREVIEW_EXPIRED' | 'IDEMPOTENCY_CONFLICT' | 'REPEAT_IN_PROGRESS';

type TargetResult = {
  weekStartDate: string;
  reasonCode: RepeatReasonCode;
  classification: 'ELIGIBLE' | 'SKIPPED' | 'INVALID';
  copiedSlotCount: number;
};

const BLOCKING_STATUSES: SessionStatus[] = [
  SessionStatus.PENDING_PAYMENT,
  SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
  SessionStatus.UPCOMING,
  SessionStatus.READY_TO_JOIN,
  SessionStatus.IN_PROGRESS,
];

@Injectable()
export class AvailabilityScheduleRepeatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly practitionerRepository: AvailabilityPractitionerRepository,
    private readonly weekRepository: PractitionerAvailabilityWeekRepository,
    private readonly calendar: AvailabilityWeekCalendarService,
    private readonly config: ConfigService,
  ) {}

  async preview(input: {
    userId: string;
    sourceWeekId: string;
    targetWeekStartDates: string[];
    idempotencyKey: string;
  }) {
    const now = this.getNow();
    const practitioner = await this.getPractitioner(input.userId);
    const timezone = this.getTimezone(practitioner.user.timezone ?? '');
    const source = await this.weekRepository.findByIdForPractitioner(practitioner.id, input.sourceWeekId);
    if (!source) throw this.notFound('SOURCE_NOT_FOUND');
    this.getRangeInWindow(source.weekStartDate, timezone, 'SOURCE_OUT_OF_ACTIVE_RANGE', now);
    if (!source.slots.length) throw this.badRequest('SOURCE_HAS_NO_SESSION_TIMES');
    if (this.getTimezone(source.timezone) !== timezone) throw this.badRequest('INVALID_TIMEZONE');

    const originalDates = input.targetWeekStartDates;
    const uniqueDates = [...new Set(originalDates)].filter((date) => originalDates.filter((item) => item === date).length === 1).sort();
    const requestFingerprint = this.fingerprint({ sourceWeekId: source.id, targetWeekStartDates: uniqueDates });
    const sourceFingerprint = this.sourceFingerprint(source);
    const existingOperation = await this.prisma.availabilityScheduleRepeatOperation.findUnique({
      where: { practitionerId_idempotencyKey: { practitionerId: practitioner.id, idempotencyKey: input.idempotencyKey } },
    });
    if (existingOperation) {
      if (existingOperation.requestFingerprint !== requestFingerprint) throw this.conflict('IDEMPOTENCY_CONFLICT');
      if (existingOperation.resultPayload) return existingOperation.resultPayload;
      if (existingOperation.previewPayload) {
        return {
          ...(existingOperation.previewPayload as object),
          operationId: existingOperation.id,
          sourceSlotCount30Minutes: source.slots.filter((slot) => slot.durationMinutes === 30).length,
          sourceSlotCount60Minutes: source.slots.filter((slot) => slot.durationMinutes === 60).length,
        };
      }
    }

    const window = this.calendar.getActiveWindow({ timezone, now });
    const existingWeeks = await this.weekRepository.findManyByPractitionerAndWeekStarts(
      practitioner.id,
      uniqueDates.filter((date) => this.isIsoDate(date) && this.calendar.isSundayWeekStart(date)).map((date) => this.calendar.getWeekRangeByStartDate({ weekStartDate: date }).startDate),
    );
    const bookedDates = await this.findBookedTargetDates(practitioner.id, uniqueDates, timezone);
    const existingByDate = new Map(existingWeeks.map((week) => [this.dateOf(week.weekStartDate), week]));
    const targets: TargetResult[] = originalDates.map((date) => {
      if (originalDates.filter((item) => item === date).length > 1) {
        return this.target(date, 'TARGET_DUPLICATED', 'INVALID', 0);
      }
      return this.classifyTarget({ date, sourceDate: this.dateOf(source.weekStartDate), window, existing: existingByDate.get(date), booked: bookedDates.has(date), slotCount: source.slots.length, timezone, slots: source.slots });
    });
    const expiresAt = new Date(now.getTime() + this.ttlMinutes() * 60_000);
    const preview = {
      operationId: existingOperation?.id ?? undefined,
      expiresAt: expiresAt.toISOString(),
      sourceWeekId: source.id,
      timezone,
      activeRange: window.activeRange,
      sourceSlotCount30Minutes: source.slots.filter((slot) => slot.durationMinutes === 30).length,
      sourceSlotCount60Minutes: source.slots.filter((slot) => slot.durationMinutes === 60).length,
      targets,
      confirmationAllowed: targets.some((target) => target.reasonCode === 'ELIGIBLE'),
    };
    let operation = existingOperation;
    if (!operation) {
      try {
        operation = await this.prisma.availabilityScheduleRepeatOperation.create({
          data: {
            practitionerId: practitioner.id,
            sourceWeekId: source.id,
            idempotencyKey: input.idempotencyKey,
            requestFingerprint,
            sourceFingerprint,
            selectedTargetWeekDates: uniqueDates,
            previewPayload: preview as unknown as Prisma.InputJsonValue,
            expiresAt,
          },
        });
      } catch (error) {
        // A concurrent preview may win the permanent idempotency key race.
        const racedOperation = await this.prisma.availabilityScheduleRepeatOperation.findUnique({
          where: { practitionerId_idempotencyKey: { practitionerId: practitioner.id, idempotencyKey: input.idempotencyKey } },
        });
        if (!racedOperation) throw error;
        if (racedOperation.requestFingerprint !== requestFingerprint) throw this.conflict('IDEMPOTENCY_CONFLICT');
        operation = racedOperation;
      }
    }
    return { ...preview, operationId: operation.id };
  }

  async confirm(input: { userId: string; sourceWeekId: string; operationId: string; idempotencyKey: string }) {
    const now = this.getNow();
    const practitioner = await this.getPractitioner(input.userId);
    const operation = await this.prisma.availabilityScheduleRepeatOperation.findFirst({
      where: { id: input.operationId, practitionerId: practitioner.id, sourceWeekId: input.sourceWeekId },
    });
    if (!operation) throw this.notFound('SOURCE_NOT_FOUND');
    if (operation.idempotencyKey !== input.idempotencyKey) throw this.conflict('IDEMPOTENCY_CONFLICT');
    if (operation.resultPayload) return operation.resultPayload;
    if (operation.status === AvailabilityScheduleRepeatOperationStatus.PROCESSING) {
      const leaseExpiredAt = new Date(now.getTime() - this.ttlMinutes() * 60_000);
      const reclaimed = operation.updatedAt <= leaseExpiredAt
        ? await this.prisma.availabilityScheduleRepeatOperation.updateMany({
            where: { id: operation.id, status: AvailabilityScheduleRepeatOperationStatus.PROCESSING, updatedAt: { lt: leaseExpiredAt } },
            data: { status: AvailabilityScheduleRepeatOperationStatus.PREVIEWED },
          })
        : { count: 0 };
      if (!reclaimed.count) throw this.conflict('REPEAT_IN_PROGRESS');
    }
    if (operation.status === AvailabilityScheduleRepeatOperationStatus.FAILED) return operation.resultPayload ?? { operationId: operation.id, status: 'FAILED', targets: [], warnings: ['REPEAT_FAILED'] };
    if (operation.expiresAt.getTime() <= now.getTime()) {
      await this.prisma.availabilityScheduleRepeatOperation.update({ where: { id: operation.id }, data: { status: AvailabilityScheduleRepeatOperationStatus.EXPIRED, safeErrorMetadata: { reasonCode: 'REPEAT_PREVIEW_EXPIRED' } } });
      throw this.conflict('REPEAT_PREVIEW_EXPIRED');
    }
    const claimed = await this.prisma.availabilityScheduleRepeatOperation.updateMany({
      where: { id: operation.id, status: AvailabilityScheduleRepeatOperationStatus.PREVIEWED },
      data: { status: AvailabilityScheduleRepeatOperationStatus.PROCESSING },
    });
    if (!claimed.count) {
      const current = await this.prisma.availabilityScheduleRepeatOperation.findUnique({ where: { id: operation.id } });
      if (current?.resultPayload) return current.resultPayload;
      if (current?.status === AvailabilityScheduleRepeatOperationStatus.FAILED) {
        return current.resultPayload ?? { operationId: operation.id, status: 'FAILED', targets: [], warnings: ['REPEAT_FAILED'] };
      }
      throw this.conflict('REPEAT_IN_PROGRESS');
    }

    try {
      const timezone = this.getTimezone((await this.getPractitioner(input.userId)).user.timezone ?? '');
      const source = await this.weekRepository.findByIdForPractitioner(practitioner.id, input.sourceWeekId);
      if (!source) throw this.notFound('SOURCE_NOT_FOUND');
      if (this.sourceFingerprint(source) !== operation.sourceFingerprint) throw this.conflict('SOURCE_CHANGED_SINCE_PREVIEW');
      if (!source.slots.length) throw this.badRequest('SOURCE_HAS_NO_SESSION_TIMES');
      if (this.getTimezone(source.timezone) !== timezone) throw this.badRequest('INVALID_TIMEZONE');
      const window = this.calendar.getActiveWindow({ timezone, now });
      this.getRangeInWindow(source.weekStartDate, timezone, 'SOURCE_OUT_OF_ACTIVE_RANGE', now);
      const dates = this.jsonStringArray(operation.selectedTargetWeekDates);
      const result = await this.prisma.$transaction(async (tx) => {
        const existing = await this.weekRepository.findManyByPractitionerAndWeekStarts(practitioner.id, dates.map((date) => this.calendar.getWeekRangeByStartDate({ weekStartDate: date }).startDate), tx);
        const bookedDates = await this.findBookedTargetDates(practitioner.id, dates, timezone, tx);
        const existingByDate = new Map(existing.map((week) => [this.dateOf(week.weekStartDate), week]));
        const targets: TargetResult[] = [];
        const previewEligibleDates = new Set(
          this.previewTargets(operation.previewPayload).filter((target) => target.reasonCode === 'ELIGIBLE').map((target) => target.weekStartDate),
        );
        const eligible = dates.filter((date) => {
          const target = this.classifyTarget({ date, sourceDate: this.dateOf(source.weekStartDate), window, existing: existingByDate.get(date), booked: bookedDates.has(date), slotCount: source.slots.length, timezone, slots: source.slots });
          if (previewEligibleDates.has(date) && target.classification !== 'ELIGIBLE') {
            target.reasonCode = 'TARGET_CHANGED_SINCE_PREVIEW';
            target.classification = 'SKIPPED';
            target.copiedSlotCount = 0;
          }
          targets.push(target);
          return target.reasonCode === 'ELIGIBLE';
        });
        const ranges = eligible.map((date) => this.calendar.getWeekRangeByStartDate({ weekStartDate: date }));
        if (eligible.length) {
          const inserted = await tx.practitionerAvailabilityWeek.createManyAndReturn({
            data: ranges.map((range) => ({ practitionerId: practitioner.id, weekStartDate: range.startDate, weekEndDate: range.endDate, timezone: source.timezone, status: AvailabilityWeekStatus.DRAFT, copiedFromWeekId: source.id })),
            skipDuplicates: true,
            select: { id: true, weekStartDate: true },
          });
          const insertedDates = new Set(inserted.map((week) => this.dateOf(week.weekStartDate)));
          for (const target of targets) {
            if (target.reasonCode === 'ELIGIBLE' && !insertedDates.has(target.weekStartDate)) {
              target.reasonCode = 'TARGET_CHANGED_SINCE_PREVIEW';
              target.classification = 'SKIPPED';
              target.copiedSlotCount = 0;
            }
          }
          for (const week of inserted) {
            await tx.practitionerAvailabilityWeekSlot.createMany({
              data: source.slots.map((slot) => ({ weekId: week.id, weekday: slot.weekday, startMinuteOfDay: slot.startMinuteOfDay, endMinuteOfDay: slot.endMinuteOfDay, durationMinutes: slot.durationMinutes, timezone: source.timezone })),
            });
          }
        }
        const payload = { operationId: operation.id, status: 'COMPLETED' as const, targets, warnings: [] as string[] };
        await tx.availabilityScheduleRepeatOperation.update({ where: { id: operation.id }, data: { status: AvailabilityScheduleRepeatOperationStatus.COMPLETED, resultPayload: payload as unknown as Prisma.InputJsonValue, completedAt: new Date() } });
        return payload;
      });
      return result;
    } catch (error) {
      const failure = {
        operationId: operation.id,
        status: 'FAILED' as const,
        targets: [] as TargetResult[],
        warnings: ['REPEAT_FAILED'],
      };
      if (error instanceof ConflictException && (error.getResponse() as { errorCode?: string }).errorCode === 'SOURCE_CHANGED_SINCE_PREVIEW') {
        failure.warnings = ['SOURCE_CHANGED_SINCE_PREVIEW'];
        await this.prisma.availabilityScheduleRepeatOperation.update({ where: { id: operation.id }, data: { status: AvailabilityScheduleRepeatOperationStatus.FAILED, resultPayload: failure, safeErrorMetadata: { reasonCode: 'SOURCE_CHANGED_SINCE_PREVIEW' } } });
        throw error;
      }
      await this.prisma.availabilityScheduleRepeatOperation.update({ where: { id: operation.id }, data: { status: AvailabilityScheduleRepeatOperationStatus.FAILED, resultPayload: failure, safeErrorMetadata: { reasonCode: 'REPEAT_FAILED' } } });
      throw error;
    }
  }

  private async getPractitioner(userId: string) {
    const practitioner = await this.practitionerRepository.findByUserId(userId);
    if (!practitioner) throw new NotFoundException({ errorCode: 'AVAILABILITY_PRACTITIONER_NOT_FOUND' });
    return practitioner;
  }

  private getTimezone(value: string) {
    try { return assertIanaTimeZoneInput(value, { messageKey: 'availability.errors.invalidTimezone', error: 'INVALID_TIMEZONE' }); }
    catch { throw this.badRequest('INVALID_TIMEZONE'); }
  }

  private getRangeInWindow(date: Date, timezone: string, code: RepeatReasonCode, now?: Date) {
    try { return this.calendar.assertWeekInsideActiveWindow({ weekStartDate: date, timezone, now }); }
    catch { throw this.badRequest(code); }
  }

  private classifyTarget(input: { date: string; sourceDate: string; window: ReturnType<AvailabilityWeekCalendarService['getActiveWindow']>; existing: { status: AvailabilityWeekStatus } | undefined; booked: boolean; slotCount: number; timezone: string; slots: Array<{ weekday: any; startMinuteOfDay: number; endMinuteOfDay: number }> }): TargetResult {
    if (!this.isIsoDate(input.date) || !this.calendar.isSundayWeekStart(input.date)) return this.target(input.date, 'TARGET_NOT_SUNDAY', 'INVALID', 0);
    if (input.date === input.sourceDate) return this.target(input.date, 'TARGET_EQUALS_SOURCE', 'INVALID', 0);
    const index = input.window.weeks.findIndex((week) => week.startDateIso === input.date);
    if (index < 0) return this.target(input.date, 'TARGET_OUT_OF_ACTIVE_RANGE', 'INVALID', 0);
    if (index === 0) return this.target(input.date, 'TARGET_NOT_FUTURE', 'INVALID', 0);
    if (input.existing?.status === AvailabilityWeekStatus.PUBLISHED) return this.target(input.date, 'TARGET_PUBLISHED', 'SKIPPED', 0);
    if (input.existing && input.booked) return this.target(input.date, 'TARGET_HAS_BOOKINGS', 'SKIPPED', 0);
    if (input.existing) return this.target(input.date, 'TARGET_ALREADY_EXISTS', 'SKIPPED', 0);
    try {
      assertWeeklySlotsHaveValidLocalTimes({ weekStartDate: this.calendar.getWeekRangeByStartDate({ weekStartDate: input.date }).startDate, timezone: input.timezone, slots: input.slots.map((slot) => ({ dayOfWeek: WEEKDAY_ENUM_TO_INDEX[slot.weekday], startMinuteOfDay: slot.startMinuteOfDay, endMinuteOfDay: slot.endMinuteOfDay })) });
    } catch (error) {
      const response = error instanceof BadRequestException ? error.getResponse() : undefined;
      const errorCode = typeof response === 'object' && response !== null && 'errorCode' in response && response.errorCode === 'AVAILABILITY_AMBIGUOUS_LOCAL_TIME'
        ? 'DST_AMBIGUOUS_TIME'
        : 'DST_INVALID_TIME';
      return this.target(input.date, errorCode, 'INVALID', 0);
    }
    return this.target(input.date, 'ELIGIBLE', 'ELIGIBLE', input.slotCount);
  }

  private async findBookedTargetDates(practitionerId: string, dates: string[], timezone: string, tx?: Prisma.TransactionClient) {
    if (!dates.length) return new Set<string>();
    const ranges = dates.filter((date) => this.isIsoDate(date) && this.calendar.isSundayWeekStart(date)).map((date) => this.calendar.getWeekRangeByStartDate({ weekStartDate: date }));
    if (!ranges.length) return new Set<string>();
    const db = tx ?? this.prisma;
    const sessions = await db.session.findMany({ where: { practitionerId, status: { in: BLOCKING_STATUSES }, scheduledStartAt: { gte: ranges[0].startDate, lt: ranges[ranges.length - 1].endDate } }, select: { scheduledStartAt: true } });
    return new Set(sessions.map((session) => this.dateOf(session.scheduledStartAt ?? new Date())));
  }

  private sourceFingerprint(source: { id: string; timezone: string; slots: Array<{ weekday: any; startMinuteOfDay: number; endMinuteOfDay: number; durationMinutes: number }> }) {
    const slots = source.slots.map((slot) => ({ weekday: slot.weekday, dayOfWeek: WEEKDAY_ENUM_TO_INDEX[slot.weekday], startMinuteOfDay: slot.startMinuteOfDay, endMinuteOfDay: slot.endMinuteOfDay, durationMinutes: slot.durationMinutes }));
    slots.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    return this.fingerprint({ id: source.id, timezone: source.timezone, slots });
  }

  private fingerprint(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
  private dateOf(value: Date) { return value.toISOString().slice(0, 10); }
  private isIsoDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && this.dateOf(new Date(`${value}T00:00:00.000Z`)) === value; }
  private jsonStringArray(value: Prisma.JsonValue) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
  private previewTargets(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [] as TargetResult[];
    const targets = (value as { targets?: unknown }).targets;
    return Array.isArray(targets) ? targets.filter((target): target is TargetResult => Boolean(target && typeof target === 'object' && 'weekStartDate' in target && 'reasonCode' in target)) : [];
  }
  private target(weekStartDate: string, reasonCode: RepeatReasonCode, classification: TargetResult['classification'], copiedSlotCount: number): TargetResult { return { weekStartDate, reasonCode, classification, copiedSlotCount }; }
  private ttlMinutes() { return this.config.get<number>('availability.repeatPreviewTtlMinutes') ?? DEFAULT_AVAILABILITY_REPEAT_PREVIEW_TTL_MINUTES; }
  private getNow() { return new Date(); }
  private badRequest(errorCode: RepeatReasonCode) { return new BadRequestException({ errorCode }); }
  private conflict(errorCode: RepeatReasonCode) { return new ConflictException({ errorCode }); }
  private notFound(errorCode: RepeatReasonCode) { return new NotFoundException({ errorCode }); }
}
