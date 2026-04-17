import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingPatientRepository } from '../repositories/instant-booking-patient.repository';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';

@Injectable()
export class ListPatientInstantBookingRequestsUseCase {
  constructor(
    private readonly instantBookingPatientRepository: InstantBookingPatientRepository,
    private readonly instantBookingRequestRepository: InstantBookingRequestRepository,
    private readonly instantBookingMapper: InstantBookingMapper,
  ) {}

  async execute(input: { userId: string; locale: SupportedLocale }) {
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
      patientId: patient.id,
    });

    const requests = await this.instantBookingRequestRepository.listPatientRequests(
      patient.id,
    );

    return {
      items: requests.map((request) => this.instantBookingMapper.toViewModel(request)),
    };
  }
}
