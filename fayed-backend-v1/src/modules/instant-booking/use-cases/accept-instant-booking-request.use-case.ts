import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstantBookingRequestStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingPractitionerRepository } from '../repositories/instant-booking-practitioner.repository';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { CreateSessionFromInstantBookingService } from '../services/create-session-from-instant-booking.service';
import { ValidateInstantBookingEligibilityService } from '../services/validate-instant-booking-eligibility.service';
import { ValidateInstantBookingStatusTransitionService } from '../services/validate-instant-booking-status-transition.service';

@Injectable()
export class AcceptInstantBookingRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly instantBookingPractitionerRepository: InstantBookingPractitionerRepository,
    private readonly instantBookingRequestRepository: InstantBookingRequestRepository,
    private readonly validateInstantBookingEligibilityService: ValidateInstantBookingEligibilityService,
    private readonly validateInstantBookingStatusTransitionService: ValidateInstantBookingStatusTransitionService,
    private readonly createSessionFromInstantBookingService: CreateSessionFromInstantBookingService,
    private readonly instantBookingMapper: InstantBookingMapper,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    requestId: string;
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

    if (request.linkedSessionId) {
      throw new ConflictException({
        messageKey: 'instantBooking.errors.requestAlreadyAccepted',
        error: 'INSTANT_BOOKING_REQUEST_ALREADY_ACCEPTED',
      });
    }

    this.validateInstantBookingStatusTransitionService.assertCanTransition(
      request.status,
      InstantBookingRequestStatus.ACCEPTED,
    );

    const nowUtc = new Date();
    const eligibility =
      await this.validateInstantBookingEligibilityService.assertPractitionerCanReceiveInstantBooking(
        {
          practitioner,
          durationMinutes: request.requestedDurationMinutes,
          sessionMode: request.preferredMode,
          nowUtc,
        },
      );

    const accepted = await this.prisma.$transaction(async (tx) => {
      const session =
        await this.createSessionFromInstantBookingService.createFromAcceptedRequest(
          {
            request,
            actorUserId: input.userId,
            startsAtUtc: eligibility.startsAtUtc,
            endsAtUtc: eligibility.endsAtUtc,
            timezone: eligibility.timezone,
            tx,
          },
        );

      return this.instantBookingRequestRepository.updateRequest(
        request.id,
        {
          status: InstantBookingRequestStatus.ACCEPTED,
          respondedAt: nowUtc,
          linkedSessionId: session.id,
        },
        tx,
      );
    });

    return {
      item: this.instantBookingMapper.toViewModel(accepted),
    };
  }
}
