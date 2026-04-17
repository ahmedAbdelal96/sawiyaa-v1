import { BadRequestException, Injectable } from '@nestjs/common';
import { AvailabilitySlot } from '@prisma/client';
import { isValidIanaTimeZone } from '../utils/availability-timezone.util';

/**
 * Practitioner timezone resolution is explicit because schedule interpretation must never depend on browser locale.
 * The same resolver is reused by self-service and public reads to keep availability semantics stable.
 */
@Injectable()
export class ResolvePractitionerTimezoneService {
  resolve(input: {
    requestedTimezone?: string | null;
    weeklySlots?: Array<Pick<AvailabilitySlot, 'timezone'>>;
    fallbackTimezone?: string | null;
  }): string {
    const timezoneCandidates = [
      input.requestedTimezone?.trim(),
      input.weeklySlots?.[0]?.timezone?.trim(),
      input.fallbackTimezone?.trim(),
      'UTC',
    ].filter((candidate): candidate is string => Boolean(candidate));

    const timezone = timezoneCandidates.find((candidate) =>
      isValidIanaTimeZone(candidate),
    );

    if (!timezone) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidTimezone',
        error: 'AVAILABILITY_INVALID_TIMEZONE',
      });
    }

    return timezone;
  }

  assertValid(timezone: string): void {
    if (!isValidIanaTimeZone(timezone)) {
      throw new BadRequestException({
        messageKey: 'availability.errors.invalidTimezone',
        error: 'AVAILABILITY_INVALID_TIMEZONE',
      });
    }
  }
}
