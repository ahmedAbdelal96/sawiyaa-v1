import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class MatchingSessionAccessPolicy {
  assertOwnership(input: {
    sessionPatientProfileId: string | null;
    requesterPatientProfileId: string;
  }) {
    if (!input.sessionPatientProfileId) {
      throw new ForbiddenException({
        messageKey: 'matching.errors.guestSessionAccessNotSupported',
        error: 'MATCHING_GUEST_SESSION_ACCESS_NOT_SUPPORTED',
      });
    }

    if (input.sessionPatientProfileId !== input.requesterPatientProfileId) {
      throw new ForbiddenException({
        messageKey: 'matching.errors.matchingSessionForbidden',
        error: 'MATCHING_SESSION_FORBIDDEN',
      });
    }
  }
}

