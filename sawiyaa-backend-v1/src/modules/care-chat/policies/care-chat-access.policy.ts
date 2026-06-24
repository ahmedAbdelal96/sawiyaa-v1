import { ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Object-level authorization for CareChat resources.
 *
 * Note: Most care-chat enforcement is done at the DB query level using
 * `findByIdForActor({ profileId })` — non-participants get a null return
 * (which becomes a 404). This policy provides an explicit throw for contexts
 * where the conversation is already fetched and access must be validated.
 */
@Injectable()
export class CareChatAccessPolicy {
  assertParticipant(input: {
    actorType: 'PATIENT' | 'PRACTITIONER';
    actorProfileId: string;
    patientProfileId: string | null;
    practitionerProfileId: string | null;
  }): void {
    const expectedId =
      input.actorType === 'PATIENT'
        ? input.patientProfileId
        : input.practitionerProfileId;

    if (!expectedId || expectedId !== input.actorProfileId) {
      throw new ForbiddenException({
        messageKey: 'careChat.errors.conversationAccessDenied',
        error: 'CARE_CHAT_CONVERSATION_ACCESS_DENIED',
      });
    }
  }
}
