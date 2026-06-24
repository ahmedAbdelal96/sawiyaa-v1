import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Session booking request validation keeps temporal assumptions explicit.
 * V1 supports only future scheduled sessions and leaves locking/payment orchestration to later modules.
 */
@Injectable()
export class ValidateSessionBookingRequestService {
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
