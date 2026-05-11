import { ForbiddenException } from '@nestjs/common';
import { PaymentAccessPolicy } from './payment-access.policy';

describe('PaymentAccessPolicy', () => {
  let policy: PaymentAccessPolicy;

  beforeEach(() => {
    policy = new PaymentAccessPolicy();
  });

  describe('assertPatientOwner', () => {
    it('passes when patient IDs match', () => {
      expect(() =>
        policy.assertPatientOwner({
          paymentPatientId: 'patient-a',
          requesterPatientId: 'patient-a',
        }),
      ).not.toThrow();
    });

    it('throws ForbiddenException when patient A tries to access patient B payment', () => {
      expect(() =>
        policy.assertPatientOwner({
          paymentPatientId: 'patient-b',
          requesterPatientId: 'patient-a',
        }),
      ).toThrow(ForbiddenException);
    });

    it('ForbiddenException carries PAYMENT_FORBIDDEN error code', () => {
      try {
        policy.assertPatientOwner({
          paymentPatientId: 'patient-b',
          requesterPatientId: 'patient-a',
        });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        const response = (err as ForbiddenException).getResponse() as Record<
          string,
          unknown
        >;
        expect(response.error).toBe('PAYMENT_FORBIDDEN');
      }
    });
  });
});
