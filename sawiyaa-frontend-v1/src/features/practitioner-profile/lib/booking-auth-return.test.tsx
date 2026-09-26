import { describe, expect, it } from 'vitest';
import {
  buildPractitionerBookingAuthReturnPath,
  parsePractitionerBookingIntent,
} from './booking-auth-return';

describe('practitioner booking auth return', () => {
  it('preserves the practitioner and booking intent without carrying stale slots', () => {
    expect(buildPractitionerBookingAuthReturnPath('dr/ali', 60)).toBe(
      '/patient/practitioners/dr%2Fali?intent=book&duration=60',
    );
  });

  it('accepts only the supported booking durations from the callback', () => {
    expect(parsePractitionerBookingIntent("book", "30")).toBe(30);
    expect(parsePractitionerBookingIntent("book", "60")).toBe(60);
    expect(parsePractitionerBookingIntent("book", "45")).toBeNull();
    expect(parsePractitionerBookingIntent("other", "60")).toBeNull();
  });
});
