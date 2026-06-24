import { ForbiddenException } from '@nestjs/common';
import { SessionAccessPolicy } from './session-access.policy';

describe('SessionAccessPolicy', () => {
  let policy: SessionAccessPolicy;

  beforeEach(() => {
    policy = new SessionAccessPolicy();
  });

  describe('assertPatientOwner', () => {
    it('passes when patient IDs match', () => {
      expect(() =>
        policy.assertPatientOwner({
          sessionPatientId: 'patient-a',
          requesterPatientId: 'patient-a',
        }),
      ).not.toThrow();
    });

    it('throws ForbiddenException when patient A tries to access patient B session', () => {
      expect(() =>
        policy.assertPatientOwner({
          sessionPatientId: 'patient-b',
          requesterPatientId: 'patient-a',
        }),
      ).toThrow(ForbiddenException);
    });

    it('ForbiddenException carries SESSION_ACCESS_DENIED error code', () => {
      try {
        policy.assertPatientOwner({
          sessionPatientId: 'patient-b',
          requesterPatientId: 'patient-a',
        });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        const response = (err as ForbiddenException).getResponse() as Record<
          string,
          unknown
        >;
        expect(response.error).toBe('SESSION_ACCESS_DENIED');
      }
    });
  });

  describe('assertPractitionerOwner', () => {
    it('passes when practitioner IDs match', () => {
      expect(() =>
        policy.assertPractitionerOwner({
          sessionPractitionerId: 'prac-a',
          requesterPractitionerId: 'prac-a',
        }),
      ).not.toThrow();
    });

    it('throws ForbiddenException when practitioner A tries to access practitioner B session', () => {
      expect(() =>
        policy.assertPractitionerOwner({
          sessionPractitionerId: 'prac-b',
          requesterPractitionerId: 'prac-a',
        }),
      ).toThrow(ForbiddenException);
    });
  });
});
