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

  it('rejects invalid transitions', () => {
    expect(() =>
      service.assertCanTransition(
        SessionStatus.COMPLETED,
        SessionStatus.CANCELLED,
      ),
    ).toThrow(BadRequestException);
  });
});
