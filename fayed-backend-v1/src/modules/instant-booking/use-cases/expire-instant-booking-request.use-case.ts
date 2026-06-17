import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstantBookingRequestStatus } from '@prisma/client';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { ValidateInstantBookingStatusTransitionService } from '../services/validate-instant-booking-status-transition.service';

@Injectable()
export class ExpireInstantBookingRequestUseCase {
  constructor(
    private readonly instantBookingRequestRepository: InstantBookingRequestRepository,
    private readonly validateInstantBookingStatusTransitionService: ValidateInstantBookingStatusTransitionService,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly instantBookingMapper: InstantBookingMapper,
  ) {}

  async execute(input: { requestId: string }) {
    const nowUtc = new Date();
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

    const expiredCount = await this.instantBookingRequestRepository.expirePendingRequest(
      {
        requestId: request.id,
        now: nowUtc,
      },
    );

    if (expiredCount.count === 0) {
      const currentRequest = await this.instantBookingRequestRepository.findById(
        request.id,
      );

      if (!currentRequest) {
        throw new NotFoundException({
          messageKey: 'instantBooking.errors.requestNotFound',
          error: 'INSTANT_BOOKING_REQUEST_NOT_FOUND',
        });
      }

      if (currentRequest.status === InstantBookingRequestStatus.EXPIRED) {
        return {
          item: this.instantBookingMapper.toViewModel(currentRequest),
        };
      }

      if (currentRequest.status === InstantBookingRequestStatus.PENDING) {
        throw new ConflictException({
          messageKey: 'instantBooking.errors.requestAlreadyFinalized',
          error: 'INSTANT_BOOKING_REQUEST_ALREADY_FINALIZED',
        });
      }

      this.validateInstantBookingStatusTransitionService.assertCanTransition(
        currentRequest.status,
        InstantBookingRequestStatus.EXPIRED,
      );
    }

    const expired = await this.instantBookingRequestRepository.findById(
      request.id,
    );

    if (!expired) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.requestNotFound',
        error: 'INSTANT_BOOKING_REQUEST_NOT_FOUND',
      });
    }

    await this.operationalNotificationService.notifyInstantBookingExpired({
      patientProfileId: expired.patient.id,
      requestId: expired.id,
    });

    return {
      item: this.instantBookingMapper.toViewModel(expired),
    };
  }
}
