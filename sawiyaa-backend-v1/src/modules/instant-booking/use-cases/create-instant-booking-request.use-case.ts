import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionMode } from '@prisma/client';
import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';
import { InstantBookingPolicyService } from '../services/instant-booking-policy.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingPatientRepository } from '../repositories/instant-booking-patient.repository';
import { InstantBookingPractitionerRepository } from '../repositories/instant-booking-practitioner.repository';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { ValidateInstantBookingEligibilityService } from '../services/validate-instant-booking-eligibility.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

type InstantBookingPricingSnapshot = {
  EGP?: {
    30?: string | null;
    60?: string | null;
  };
  USD?: {
    30?: string | null;
    60?: string | null;
  };
};

/**
 * Patient instant booking creation is a request-layer operation only.
 * It checks current practitioner live readiness without creating a Session yet.
 */
@Injectable()
export class CreateInstantBookingRequestUseCase {
  constructor(
    private readonly instantBookingPatientRepository: InstantBookingPatientRepository,
    private readonly instantBookingPractitionerRepository: InstantBookingPractitionerRepository,
    private readonly instantBookingRequestRepository: InstantBookingRequestRepository,
    private readonly validateInstantBookingEligibilityService: ValidateInstantBookingEligibilityService,
    private readonly instantBookingMapper: InstantBookingMapper,
    private readonly instantBookingPolicyService: InstantBookingPolicyService,
    private readonly operationalNotificationService: OperationalNotificationService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    practitionerSlug: string;
    durationMinutes: 30 | 60;
    countryIsoCode?: string | null;
    idempotencyKey?: string;
  }) {
    const patient = await this.instantBookingPatientRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.patientNotFound',
        error: 'INSTANT_BOOKING_PATIENT_NOT_FOUND',
      });
    }

    const idempotencyKey = input.idempotencyKey?.trim() || null;
    if (idempotencyKey) {
      const replay = await this.instantBookingRequestRepository.findByPatientIdempotencyKey(patient.id, idempotencyKey);
      if (replay) return { item: this.instantBookingMapper.toViewModel(replay) };
    }

    const practitioner =
      await this.instantBookingPractitionerRepository.findByPublicSlug(
        input.practitionerSlug,
      );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.practitionerNotFound',
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_FOUND',
      });
    }

    const nowUtc = new Date();

    await this.instantBookingRequestRepository.markExpired(nowUtc, {
      patientId: patient.id,
      practitionerId: practitioner.id,
    });

    const duplicatePending =
      await this.instantBookingRequestRepository.findConflictingPendingRequests(
        {
          patientId: patient.id,
          practitionerId: practitioner.id,
          now: nowUtc,
        },
      );

    if (duplicatePending.length > 0) {
      throw new ConflictException({
        messageKey: 'instantBooking.errors.pendingRequestAlreadyExists',
        error: 'INSTANT_BOOKING_PENDING_REQUEST_ALREADY_EXISTS',
      });
    }

    const currencyCode = resolvePaymentRegionalResolution({ requestCountryIsoCode: input.countryIsoCode ?? null }).currencyCode;

    await this.validateInstantBookingEligibilityService.assertPractitionerCanReceiveInstantBooking(
      {
        practitioner,
        durationMinutes: input.durationMinutes,
        sessionMode: SessionMode.VIDEO,
        nowUtc,
        currencyCode,
      },
    );

    const selectedAmount = currencyCode === 'EGP'
      ? (input.durationMinutes === 30 ? practitioner.instantBookingPrice30Egp : practitioner.instantBookingPrice60Egp)
      : (input.durationMinutes === 30 ? practitioner.instantBookingPrice30Usd : practitioner.instantBookingPrice60Usd);
    const requestTtlMinutes = await this.instantBookingPolicyService.requestTtlMinutes();
    const pricingSnapshot: InstantBookingPricingSnapshot = {
      EGP: {
        30: this.toNullableString(practitioner.instantBookingPrice30Egp),
        60: this.toNullableString(practitioner.instantBookingPrice60Egp),
      },
      USD: {
        30: this.toNullableString(practitioner.instantBookingPrice30Usd),
        60: this.toNullableString(practitioner.instantBookingPrice60Usd),
      },
    };

    const request = await this.instantBookingRequestRepository.createRequest({
      patientId: patient.id,
      practitionerId: practitioner.id,
      requestedDurationMinutes: input.durationMinutes,
      preferredMode: SessionMode.VIDEO,
      expiresAt: new Date(
        nowUtc.getTime() + requestTtlMinutes * 60 * 1000,
      ),
      metadataJson: {
        source: 'instant-booking-request',
        capturedAt: nowUtc.toISOString(),
        requestedDurationMinutes: input.durationMinutes,
        pricingSnapshot,
        selectedMoney: { amount: this.toNullableString(selectedAmount), currencyCode },
        requestTtlMinutes,
      },
      idempotencyKey,
    });

    await this.operationalNotificationService.notifyInstantBookingCreated({
      practitionerProfileId: practitioner.id,
      requestId: request.id,
    });

    return {
      item: this.instantBookingMapper.toViewModel(request),
    };
  }

  private toNullableString(
    value: { toString(): string } | string | null | undefined,
  ) {
    if (value === null || value === undefined) {
      return null;
    }

    return value.toString();
  }
}
