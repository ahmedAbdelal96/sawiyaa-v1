import { describe, expect, it } from 'vitest';
import { buildPractitionerBookingAuthReturnPath } from './booking-auth-return';

describe('practitioner booking auth return', () => {
  it('preserves the practitioner and booking intent without carrying stale slots', () => {
    expect(buildPractitionerBookingAuthReturnPath('dr/ali', 60)).toBe(
      '/patient/practitioners/dr%2Fali?intent=book&duration=60',
    );
  });
});
