import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstantBookingRequestStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingPatientRepository } from '../repositories/instant-booking-patient.repository';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { ValidateInstantBookingStatusTransitionService } from '../services/validate-instant-booking-status-transition.service';

@Injectable()
export class CancelInstantBookingRequestUseCase {
  constructor(
    private readonly instantBookingPatientRepository: InstantBookingPatientRepository,
    private readonly instantBookingRequestRepository: InstantBookingRequestRepository,
    private readonly validateInstantBookingStatusTransitionService: ValidateInstantBookingStatusTransitionService,
    private readonly instantBookingMapper: InstantBookingMapper,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    requestId: string;
    reason?: string;
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

    const request = await this.instantBookingRequestRepository.findById(input.requestId);

    if (!request || request.patient.id !== patient.id) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.requestNotFound',
        error: 'INSTANT_BOOKING_REQUEST_NOT_FOUND',
      });
    }

    if (request.status === InstantBookingRequestStatus.CANCELLED) {
      throw new ConflictException({
        messageKey: 'instantBooking.errors.requestAlreadyCancelled',
        error: 'INSTANT_BOOKING_REQUEST_ALREADY_CANCELLED',
      });
    }

    this.validateInstantBookingStatusTransitionService.assertCanTransition(
      request.status,
      InstantBookingRequestStatus.CANCELLED,
    );

    const cancelled = await this.instantBookingRequestRepository.updateRequest(
      request.id,
      {
        status: InstantBookingRequestStatus.CANCELLED,
        respondedAt: new Date(),
        responseReason: input.reason ?? null,
      },
    );

    return {
      item: this.instantBookingMapper.toViewModel(cancelled),
    };
  }
}
