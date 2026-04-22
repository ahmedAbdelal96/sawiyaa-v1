import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstantBookingRequestStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingPractitionerRepository } from '../repositories/instant-booking-practitioner.repository';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { ValidateInstantBookingStatusTransitionService } from '../services/validate-instant-booking-status-transition.service';

@Injectable()
export class RejectInstantBookingRequestUseCase {
  constructor(
    private readonly instantBookingPractitionerRepository: InstantBookingPractitionerRepository,
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
    const practitioner =
      await this.instantBookingPractitionerRepository.findByUserId(
        input.userId,
      );

    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.practitionerNotFound',
        error: 'INSTANT_BOOKING_PRACTITIONER_NOT_FOUND',
      });
    }

    await this.instantBookingRequestRepository.markExpired(new Date(), {
      requestId: input.requestId,
      practitionerId: practitioner.id,
    });

    const request = await this.instantBookingRequestRepository.findById(
      input.requestId,
    );

    if (!request || request.practitioner.id !== practitioner.id) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.requestNotFound',
        error: 'INSTANT_BOOKING_REQUEST_NOT_FOUND',
      });
    }

    if (request.status === InstantBookingRequestStatus.REJECTED) {
      throw new ConflictException({
        messageKey: 'instantBooking.errors.requestAlreadyRejected',
        error: 'INSTANT_BOOKING_REQUEST_ALREADY_REJECTED',
      });
    }

    this.validateInstantBookingStatusTransitionService.assertCanTransition(
      request.status,
      InstantBookingRequestStatus.REJECTED,
    );

    const rejected = await this.instantBookingRequestRepository.updateRequest(
      request.id,
      {
        status: InstantBookingRequestStatus.REJECTED,
        respondedAt: new Date(),
        responseReason: input.reason ?? null,
      },
    );

    return {
      item: this.instantBookingMapper.toViewModel(rejected),
    };
  }
}
