import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstantBookingRequestStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PrismaService } from '@common/prisma/prisma.service';
import { InstantBookingMapper } from '../mappers/instant-booking.mapper';
import { InstantBookingPractitionerRepository } from '../repositories/instant-booking-practitioner.repository';
import { InstantBookingRequestRepository } from '../repositories/instant-booking-request.repository';
import { CreateSessionFromInstantBookingService } from '../services/create-session-from-instant-booking.service';
import { ValidateInstantBookingEligibilityService } from '../services/validate-instant-booking-eligibility.service';
import { ValidateInstantBookingStatusTransitionService } from '../services/validate-instant-booking-status-transition.service';
import { OperationalNotificationService } from '@modules/notifications/services/operational-notification.service';

type AcceptedInstantBookingRequest = Awaited<
  ReturnType<InstantBookingRequestRepository['updateRequest']>
>;

@Injectable()
export class AcceptInstantBookingRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly instantBookingPractitionerRepository: InstantBookingPractitionerRepository,
    private readonly instantBookingRequestRepository: InstantBookingRequestRepository,
    private readonly validateInstantBookingEligibilityService: ValidateInstantBookingEligibilityService,
    private readonly validateInstantBookingStatusTransitionService: ValidateInstantBookingStatusTransitionService,
    private readonly createSessionFromInstantBookingService: CreateSessionFromInstantBookingService,
    private readonly operationalNotificationService: OperationalNotificationService,
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

    const eligibility =
      await this.validateInstantBookingEligibilityService.assertPractitionerCanReceiveInstantBooking(
        {
          practitioner,
          durationMinutes: request.requestedDurationMinutes,
          sessionMode: request.preferredMode,
          nowUtc,
        },
      );

    let accepted: AcceptedInstantBookingRequest | null = null;

    try {
      accepted = await this.prisma.$transaction(async (tx) => {
        const claimResult =
          await this.instantBookingRequestRepository.claimPendingRequestForAcceptance(
            {
              requestId: request.id,
              practitionerId: practitioner.id,
              now: nowUtc,
            },
            tx,
          );

        if (claimResult.count === 0) {
          return null;
        }

        const claimedRequest = await this.instantBookingRequestRepository.findById(
          request.id,
          tx,
        );

        if (!claimedRequest) {
          throw new NotFoundException({
            messageKey: 'instantBooking.errors.requestNotFound',
            error: 'INSTANT_BOOKING_REQUEST_NOT_FOUND',
          });
        }

        // Phase 9a fix (AUDIT-010): Verify request transitioned to ACCEPTED
        // inside the transaction. The atomic claimPendingRequestForAcceptance
        // updateMany is the primary race-condition protection. This explicit
        // status check is defense-in-depth: if for any reason the claimed row
        // is not ACCEPTED (should be impossible under correct transaction
        // isolation), we fail fast rather than creating a duplicate session.
        if (claimedRequest.status !== InstantBookingRequestStatus.ACCEPTED) {
          throw new ConflictException({
            messageKey: 'instantBooking.errors.requestAlreadyAccepted',
            error: 'INSTANT_BOOKING_REQUEST_ALREADY_ACCEPTED',
          });
        }

        const session =
          await this.createSessionFromInstantBookingService.createFromAcceptedRequest(
            {
              request: claimedRequest,
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
            linkedSessionId: session.id,
          },
          tx,
        );
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          messageKey: 'instantBooking.errors.requestAlreadyAccepted',
          error: 'INSTANT_BOOKING_REQUEST_ALREADY_ACCEPTED',
        });
      }

      throw error;
    }

    if (!accepted) {
      const currentRequest = await this.instantBookingRequestRepository.findById(
        request.id,
      );

      if (!currentRequest || currentRequest.practitioner.id !== practitioner.id) {
        throw new NotFoundException({
          messageKey: 'instantBooking.errors.requestNotFound',
          error: 'INSTANT_BOOKING_REQUEST_NOT_FOUND',
        });
      }

      if (currentRequest.linkedSessionId) {
        throw new ConflictException({
          messageKey: 'instantBooking.errors.requestAlreadyAccepted',
          error: 'INSTANT_BOOKING_REQUEST_ALREADY_ACCEPTED',
        });
      }

      if (currentRequest.status === InstantBookingRequestStatus.PENDING) {
        throw new ConflictException({
          messageKey: 'instantBooking.errors.requestAlreadyAccepted',
          error: 'INSTANT_BOOKING_REQUEST_ALREADY_ACCEPTED',
        });
      }

      this.validateInstantBookingStatusTransitionService.assertCanTransition(
        currentRequest.status,
        InstantBookingRequestStatus.ACCEPTED,
      );
    }

    if (accepted) {
      await this.operationalNotificationService.notifyInstantBookingAccepted({
        patientProfileId: accepted.patient.id,
        requestId: accepted.id,
      });
    }

    return {
      item: this.instantBookingMapper.toViewModel(accepted!),
    };
  }
}
