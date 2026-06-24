import { ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Object-level authorization for Session resources.
 *
 * Answers: "Can this specific actor access/modify this specific session?"
 * Role/permission guards answer: "Can this actor class perform this action type?"
 * This policy answers the second, instance-level question.
 *
 * Callers are responsible for resolving the actor's profile ID before calling.
 */
@Injectable()
export class SessionAccessPolicy {
  assertPatientOwner(input: {
    sessionPatientId: string;
    requesterPatientId: string;
  }): void {
    if (input.sessionPatientId !== input.requesterPatientId) {
      throw new ForbiddenException({
        messageKey: 'sessions.errors.sessionAccessDenied',
        error: 'SESSION_ACCESS_DENIED',
      });
    }
  }

  assertPractitionerOwner(input: {
    sessionPractitionerId: string;
    requesterPractitionerId: string;
  }): void {
    if (input.sessionPractitionerId !== input.requesterPractitionerId) {
      throw new ForbiddenException({
        messageKey: 'sessions.errors.sessionAccessDenied',
        error: 'SESSION_ACCESS_DENIED',
      });
    }
  }
}
