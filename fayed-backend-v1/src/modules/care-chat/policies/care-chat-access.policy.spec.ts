import { ForbiddenException } from '@nestjs/common';
import { CareChatAccessPolicy } from './care-chat-access.policy';

describe('CareChatAccessPolicy', () => {
  let policy: CareChatAccessPolicy;

  beforeEach(() => {
    policy = new CareChatAccessPolicy();
  });

  describe('assertParticipant', () => {
    it('passes for the patient participant', () => {
      expect(() =>
        policy.assertParticipant({
          actorType: 'PATIENT',
          actorProfileId: 'patient-a',
          patientProfileId: 'patient-a',
          practitionerProfileId: 'prac-b',
        }),
      ).not.toThrow();
    });

    it('passes for the practitioner participant', () => {
      expect(() =>
        policy.assertParticipant({
          actorType: 'PRACTITIONER',
          actorProfileId: 'prac-b',
          patientProfileId: 'patient-a',
          practitionerProfileId: 'prac-b',
        }),
      ).not.toThrow();
    });

    it('throws ForbiddenException when patient is not conversation participant', () => {
      expect(() =>
        policy.assertParticipant({
          actorType: 'PATIENT',
          actorProfileId: 'patient-c',
          patientProfileId: 'patient-a',
          practitionerProfileId: 'prac-b',
        }),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when practitioner is not conversation participant', () => {
      expect(() =>
        policy.assertParticipant({
          actorType: 'PRACTITIONER',
          actorProfileId: 'prac-x',
          patientProfileId: 'patient-a',
          practitionerProfileId: 'prac-b',
        }),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when practitionerProfileId is null', () => {
      expect(() =>
        policy.assertParticipant({
          actorType: 'PRACTITIONER',
          actorProfileId: 'prac-b',
          patientProfileId: 'patient-a',
          practitionerProfileId: null,
        }),
      ).toThrow(ForbiddenException);
    });

    it('ForbiddenException carries CARE_CHAT_CONVERSATION_ACCESS_DENIED error', () => {
      try {
        policy.assertParticipant({
          actorType: 'PATIENT',
          actorProfileId: 'patient-c',
          patientProfileId: 'patient-a',
          practitionerProfileId: 'prac-b',
        });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        const response = (err as ForbiddenException).getResponse() as Record<
          string,
          unknown
        >;
        expect(response.error).toBe('CARE_CHAT_CONVERSATION_ACCESS_DENIED');
      }
    });
  });
});
