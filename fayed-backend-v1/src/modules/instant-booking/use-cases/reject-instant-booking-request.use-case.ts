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
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';
import { ValidateInstantBookingStatusTransitionService } from '../services/validate-instant-booking-status-transition.service';

@Injectable()
export class RejectInstantBookingRequestUseCase {
  constructor(
    private readonly instantBookingPractitionerRepository: InstantBookingPractitionerRepository,
    private readonly instantBookingRequestRepository: InstantBookingRequestRepository,
    private readonly validateInstantBookingStatusTransitionService: ValidateInstantBookingStatusTransitionService,
    private readonly operationalNotificationService: OperationalNotificationService,
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

    const nowUtc = new Date();

    await this.instantBookingRequestRepository.markExpired(nowUtc, {
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

    const rejectedCount =
      await this.instantBookingRequestRepository.rejectPendingRequest({
        requestId: request.id,
        practitionerId: practitioner.id,
        now: nowUtc,
        reason: input.reason ?? null,
      });

    if (rejectedCount.count === 0) {
      const currentRequest = await this.instantBookingRequestRepository.findById(
        request.id,
      );

      if (!currentRequest || currentRequest.practitioner.id !== practitioner.id) {
        throw new NotFoundException({
          messageKey: 'instantBooking.errors.requestNotFound',
          error: 'INSTANT_BOOKING_REQUEST_NOT_FOUND',
        });
      }

      if (currentRequest.status === InstantBookingRequestStatus.REJECTED) {
        throw new ConflictException({
          messageKey: 'instantBooking.errors.requestAlreadyRejected',
          error: 'INSTANT_BOOKING_REQUEST_ALREADY_REJECTED',
        });
      }

      if (currentRequest.status === InstantBookingRequestStatus.PENDING) {
        throw new ConflictException({
          messageKey: 'instantBooking.errors.requestAlreadyFinalized',
          error: 'INSTANT_BOOKING_REQUEST_ALREADY_FINALIZED',
        });
      }

      this.validateInstantBookingStatusTransitionService.assertCanTransition(
        currentRequest.status,
        InstantBookingRequestStatus.REJECTED,
      );
    }

    const rejected = await this.instantBookingRequestRepository.findById(
      request.id,
    );

    if (!rejected) {
      throw new NotFoundException({
        messageKey: 'instantBooking.errors.requestNotFound',
        error: 'INSTANT_BOOKING_REQUEST_NOT_FOUND',
      });
    }

    await this.operationalNotificationService.notifyInstantBookingRejected({
      patientProfileId: rejected.patient.id,
      requestId: rejected.id,
    });

    return {
      item: this.instantBookingMapper.toViewModel(rejected),
    };
  }
}
