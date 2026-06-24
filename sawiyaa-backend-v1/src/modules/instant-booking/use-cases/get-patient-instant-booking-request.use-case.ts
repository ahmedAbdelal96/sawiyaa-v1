import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingPatientRepository } from '../repositories/instant-booking-patient.repository';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';

@Injectable()
export class GetPatientInstantBookingRequestUseCase {
  constructor(
    private readonly instantBookingPatientRepository: InstantBookingPatientRepository,
    private readonly instantBookingRequestRepository: InstantBookingRequestRepository,
    private readonly instantBookingMapper: InstantBookingMapper,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    requestId: string;
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

    await this.instantBookingRequestRepository.markExpired(new Date(), {
      requestId: input.requestId,
      patientId: patient.id,
    });

    const request = await this.instantBookingRequestRepository.findById(
      input.requestId,
    );

    if (!request || request.patient.id !== patient.id) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.requestNotFound',
        error: 'INSTANT_BOOKING_REQUEST_NOT_FOUND',
      });
    }

    return {
      item: this.instantBookingMapper.toViewModel(request),
    };
  }
}
