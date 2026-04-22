import { Injectable, NotFoundException } from '@nestjs/common';
import { InstantBookingRequestStatus } from '@prisma/client';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { ValidateInstantBookingStatusTransitionService } from '../services/validate-instant-booking-status-transition.service';

@Injectable()
export class ExpireInstantBookingRequestUseCase {
  constructor(
    private readonly instantBookingRequestRepository: InstantBookingRequestRepository,
    private readonly validateInstantBookingStatusTransitionService: ValidateInstantBookingStatusTransitionService,
    private readonly instantBookingMapper: InstantBookingMapper,
  ) {}

  async execute(input: { requestId: string }) {
    const request = await this.instantBookingRequestRepository.findById(
      input.requestId,
    );

    if (!request) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.requestNotFound',
        error: 'INSTANT_BOOKING_REQUEST_NOT_FOUND',
      });
    }

    this.validateInstantBookingStatusTransitionService.assertCanTransition(
      request.status,
      InstantBookingRequestStatus.EXPIRED,
    );

    await this.instantBookingRequestRepository.markExpired(new Date(), {
      requestId: request.id,
    });

    const expired = await this.instantBookingRequestRepository.findById(
      request.id,
    );

    if (!expired) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.requestNotFound',
        error: 'INSTANT_BOOKING_REQUEST_NOT_FOUND',
      });
    }

    return {
      item: this.instantBookingMapper.toViewModel(expired),
    };
  }
}
