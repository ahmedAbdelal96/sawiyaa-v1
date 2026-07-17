import { BadRequestException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { ValidateSessionStatusTransitionService } from './validate-session-status-transition.service';

describe('ValidateSessionStatusTransitionService', () => {
  const service = new ValidateSessionStatusTransitionService();

  it('allows valid transitions', () => {
    expect(() =>
      service.assertCanTransition(
        SessionStatus.PENDING_PAYMENT,
        SessionStatus.CANCELLED,
      ),
    ).not.toThrow();
  });

  it('requires a confirmation state before an upcoming session can complete', () => {
    expect(() =>
      service.assertCanTransition(
        SessionStatus.UPCOMING,
        SessionStatus.COMPLETED,
      ),
    ).toThrow(BadRequestException);

    expect(() =>
      service.assertCanTransition(
        SessionStatus.AWAITING_COMPLETION_CONFIRMATION,
        SessionStatus.COMPLETED,
      ),
    ).not.toThrow();
  });

  it('rejects invalid transitions', () => {
    expect(() =>
      service.assertCanTransition(
        SessionStatus.COMPLETED,
        SessionStatus.CANCELLED,
      ),
    ).toThrow(BadRequestException);
  });
});
