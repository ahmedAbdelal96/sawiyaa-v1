import { ForbiddenException } from '@nestjs/common';
import { ConversationAccessPolicy } from './conversation-access.policy';

describe('ConversationAccessPolicy', () => {
  let policy: ConversationAccessPolicy;

  beforeEach(() => {
    policy = new ConversationAccessPolicy();
  });

  const makeParticipants = (...userIds: string[]) =>
    userIds.map((userId) => ({ userId }));

  describe('assertParticipant', () => {
    it('passes when requester is in the participants list', () => {
      expect(() =>
        policy.assertParticipant({
          participants: makeParticipants('user-a', 'user-b'),
          requesterId: 'user-a',
        }),
      ).not.toThrow();
    });

    it('throws ForbiddenException when requester is NOT a participant', () => {
      expect(() =>
        policy.assertParticipant({
          participants: makeParticipants('user-a', 'user-b'),
          requesterId: 'user-c',
        }),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for empty participant list', () => {
      expect(() =>
        policy.assertParticipant({
          participants: [],
          requesterId: 'user-a',
        }),
      ).toThrow(ForbiddenException);
    });

    it('ForbiddenException carries GENERAL_CHAT_CONVERSATION_ACCESS_DENIED errorCode', () => {
      try {
        policy.assertParticipant({
          participants: makeParticipants('user-a'),
          requesterId: 'user-b',
        });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        const response = (err as ForbiddenException).getResponse() as Record<
          string,
          unknown
        >;
        expect(response.errorCode).toBe(
          'GENERAL_CHAT_CONVERSATION_ACCESS_DENIED',
        );
      }
    });

    it('patient A cannot read patient B conversation (ownership cross-check)', () => {
      const patientAId = 'patient-a-user';
      const patientBId = 'patient-b-user';
      const practitionerId = 'practitioner-user';

      // Conversation between patient B and practitioner
      const participants = makeParticipants(patientBId, practitionerId);

      expect(() =>
        policy.assertParticipant({
          participants,
          requesterId: patientAId,
        }),
      ).toThrow(ForbiddenException);
    });
  });
});
