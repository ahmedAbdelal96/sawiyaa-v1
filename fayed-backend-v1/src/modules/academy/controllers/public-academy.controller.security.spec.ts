import { THROTTLE_POLICY_KEY } from '@common/constants/auth-metadata.constants';
import { PublicAcademyController } from './public-academy.controller';

describe('PublicAcademyController security metadata', () => {
  it('marks create enrollment as throttled', () => {
    const method = PublicAcademyController.prototype.createEnrollment;
    expect(Reflect.getMetadata(THROTTLE_POLICY_KEY, method)).toBe(
      'academy-public-enrollment',
    );
  });
});
