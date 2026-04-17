import { ConflictException } from '@nestjs/common';
import { InstantBookingRequestStatus } from '@prisma/client';
import { ValidateInstantBookingStatusTransitionService } from './validate-instant-booking-status-transition.service';

describe('ValidateInstantBookingStatusTransitionService', () => {
  const service = new ValidateInstantBookingStatusTransitionService();

  it('allows pending to accepted transition', () => {
    expect(() =>
      service.assertCanTransition(
        InstantBookingRequestStatus.PENDING,
        InstantBookingRequestStatus.ACCEPTED,
      ),
    ).not.toThrow();
  });

  it('rejects finalized to pending transition', () => {
    expect(() =>
      service.assertCanTransition(
        InstantBookingRequestStatus.REJECTED,
        InstantBookingRequestStatus.PENDING,
      ),
    ).toThrow(ConflictException);
  });
});
