import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PackageSchedulePolicy,
  SessionMode,
} from '@prisma/client';
import { ValidateSessionDurationService } from '@modules/sessions/services/validate-session-duration.service';

@Injectable()
export class ValidatePractitionerPackageService {
  constructor(
    private readonly validateSessionDurationService: ValidateSessionDurationService,
  ) {}

  validateDraft(input: {
    title: string;
    sessionCount: number;
    sessionDurationMinutes: number;
    sessionMode: SessionMode;
    priceEgp: number;
    priceUsd: number;
    schedulePolicy?: PackageSchedulePolicy;
  }): void {
    const title = input.title.trim();
    if (!title) {
      throw new BadRequestException({
        messageKey: 'packages.errors.titleRequired',
        error: 'PACKAGE_TITLE_REQUIRED',
      });
    }

    if (!Number.isInteger(input.sessionCount) || input.sessionCount <= 0) {
      throw new BadRequestException({
        messageKey: 'packages.errors.invalidSessionCount',
        error: 'PACKAGE_INVALID_SESSION_COUNT',
      });
    }

    this.validateSessionDurationService.validate(input.sessionDurationMinutes);

    if (!Object.values(SessionMode).includes(input.sessionMode)) {
      throw new BadRequestException({
        messageKey: 'packages.errors.invalidSessionMode',
        error: 'PACKAGE_INVALID_SESSION_MODE',
      });
    }

    if (!Number.isFinite(input.priceEgp) || input.priceEgp <= 0) {
      throw new BadRequestException({
        messageKey: 'packages.errors.invalidPriceEgp',
        error: 'PACKAGE_INVALID_PRICE_EGP',
      });
    }

    if (!Number.isFinite(input.priceUsd) || input.priceUsd <= 0) {
      throw new BadRequestException({
        messageKey: 'packages.errors.invalidPriceUsd',
        error: 'PACKAGE_INVALID_PRICE_USD',
      });
    }

    if (
      input.schedulePolicy &&
      input.schedulePolicy !==
        PackageSchedulePolicy.REQUIRE_ALL_SESSIONS_AT_PURCHASE
    ) {
      throw new BadRequestException({
        messageKey: 'packages.errors.unsupportedSchedulePolicy',
        error: 'PACKAGE_SCHEDULE_POLICY_NOT_SUPPORTED',
      });
    }
  }
}
