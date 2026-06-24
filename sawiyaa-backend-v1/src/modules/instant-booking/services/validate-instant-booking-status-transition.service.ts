import { ConflictException, Injectable } from '@nestjs/common';
import { InstantBookingRequestStatus } from '@prisma/client';

@Injectable()
export class ValidateInstantBookingStatusTransitionService {
  private readonly allowedTransitions: Record<
    InstantBookingRequestStatus,
    InstantBookingRequestStatus[]
  > = {
    [InstantBookingRequestStatus.PENDING]: [
      InstantBookingRequestStatus.ACCEPTED,
      InstantBookingRequestStatus.REJECTED,
      InstantBookingRequestStatus.EXPIRED,
      InstantBookingRequestStatus.CANCELLED,
      InstantBookingRequestStatus.CONVERTED_TO_SESSION,
    ],
    [InstantBookingRequestStatus.ACCEPTED]: [],
    [InstantBookingRequestStatus.REJECTED]: [],
    [InstantBookingRequestStatus.EXPIRED]: [],
    [InstantBookingRequestStatus.CANCELLED]: [],
    [InstantBookingRequestStatus.CONVERTED_TO_SESSION]: [],
  };

  assertCanTransition(
    from: InstantBookingRequestStatus,
    to: InstantBookingRequestStatus,
  ) {
    if (from === to) {
      return;
    }

    if (!this.allowedTransitions[from]?.includes(to)) {
      throw new ConflictException({
        messageKey: 'instantBooking.errors.invalidStatusTransition',
        error: 'INSTANT_BOOKING_INVALID_STATUS_TRANSITION',
        messageParams: { from, to },
      });
    }
  }
}
