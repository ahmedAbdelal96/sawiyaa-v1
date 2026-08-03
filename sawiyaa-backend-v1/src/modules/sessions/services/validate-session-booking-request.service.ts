import { BadRequestException, Injectable } from '@nestjs/common';
import { assertOffsetQualifiedIsoInstant } from '@common/utils/timezone.util';

/**
 * Session booking request validation keeps temporal assumptions explicit.
 * V1 supports only future scheduled sessions and leaves locking/payment orchestration to later modules.
 */
@Injectable()
export class ValidateSessionBookingRequestService {
  assertScheduledStartHasExplicitTimezone(value: string): void {
    assertOffsetQualifiedIsoInstant(value, {
      messageKey: 'sessions.errors.scheduledStartTimezoneRequired',
      error: 'SESSION_SCHEDULED_START_TIMEZONE_REQUIRED',
    });
  }

  assertScheduledStartIsFuture(scheduledStartAtUtc: Date): void {
    if (scheduledStartAtUtc.getTime() <= Date.now()) {
      throw new BadRequestException({
        messageKey: 'sessions.errors.scheduledStartMustBeFuture',
        error: 'SESSION_SCHEDULED_START_NOT_FUTURE',
      });
    }
  }

  assertUtcDateIsValid(value: Date, errorKey: string, errorCode: string): void {
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException({
        messageKey: errorKey,
        error: errorCode,
      });
    }
  }
}
