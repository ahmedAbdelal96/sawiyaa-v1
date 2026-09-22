import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionMode } from '@prisma/client';
import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { InstantBookingPractitionerRepository } from '../repositories/instant-booking-practitioner.repository';
import { ValidateInstantBookingEligibilityService } from '../services/validate-instant-booking-eligibility.service';

@Injectable()
export class GetPublicPractitionerInstantBookingAvailabilityUseCase {
  constructor(
    private readonly practitionerRepository: InstantBookingPractitionerRepository,
    private readonly eligibilityService: ValidateInstantBookingEligibilityService,
  ) {}

  async execute(input: {
    slug: string;
    locale: SupportedLocale;
    countryIsoCode?: string | null;
  }) {
    const practitioner = await this.practitionerRepository.findByPublicSlug(input.slug);
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.publicProfileNotFound',
        error: 'PUBLIC_PRACTITIONER_NOT_FOUND',
      });
    }

    const currencyCode = resolvePaymentRegionalResolution({
      requestCountryIsoCode: input.countryIsoCode ?? null,
    }).currencyCode;
    const nowUtc = new Date();
    const durations = { 30: false, 60: false };

    for (const durationMinutes of [30, 60] as const) {
      try {
        await this.eligibilityService.assertPractitionerCanReceiveInstantBooking({
          practitioner,
          durationMinutes,
          sessionMode: SessionMode.VIDEO,
          nowUtc,
          currencyCode,
        });
        durations[durationMinutes] = true;
      } catch {
        // The public contract intentionally exposes only safe derived availability.
      }
    }

    return {
      availableNow: durations[30] || durations[60],
      durations,
      checkedAt: nowUtc.toISOString(),
    };
  }
}
