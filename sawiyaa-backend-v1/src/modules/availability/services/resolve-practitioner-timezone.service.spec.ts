import { BadRequestException } from '@nestjs/common';
import { ResolvePractitionerTimezoneService } from './resolve-practitioner-timezone.service';

describe('ResolvePractitionerTimezoneService', () => {
  const service = new ResolvePractitionerTimezoneService();

  it('rejects fixed-offset timezone strings when validating a timezone', () => {
    expect(() => service.assertValid('+03:00')).toThrow(BadRequestException);
  });

  it('falls back to a valid IANA timezone when the requested timezone is fixed offset', () => {
    expect(
      service.resolve({
        requestedTimezone: '+03:00',
        fallbackTimezone: 'Africa/Cairo',
      }),
    ).toBe('Africa/Cairo');
  });
});
