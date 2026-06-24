import { BadRequestException } from '@nestjs/common';
import {
  assertIanaTimeZoneInput,
  isValidIanaTimeZone,
  normalizeIanaTimeZoneInput,
} from './timezone.util';

describe('timezone.util', () => {
  it('accepts common IANA timezone names', () => {
    expect(isValidIanaTimeZone('Africa/Cairo')).toBe(true);
    expect(isValidIanaTimeZone('Asia/Riyadh')).toBe(true);
    expect(isValidIanaTimeZone('Asia/Dubai')).toBe(true);
    expect(isValidIanaTimeZone('Europe/Berlin')).toBe(true);
  });

  it('normalizes valid timezone input', () => {
    expect(
      normalizeIanaTimeZoneInput('  Africa/Cairo  ', {
        messageKey: 'settings.errors.invalidTimezone',
        error: 'SETTINGS_INVALID_TIMEZONE',
      }),
    ).toBe('Africa/Cairo');
  });

  it('treats missing timezone input as nullish fallback', () => {
    expect(
      normalizeIanaTimeZoneInput(undefined, {
        messageKey: 'settings.errors.invalidTimezone',
        error: 'SETTINGS_INVALID_TIMEZONE',
      }),
    ).toBeUndefined();

    expect(
      normalizeIanaTimeZoneInput(null, {
        messageKey: 'settings.errors.invalidTimezone',
        error: 'SETTINGS_INVALID_TIMEZONE',
      }),
    ).toBeNull();

    expect(
      normalizeIanaTimeZoneInput('   ', {
        messageKey: 'settings.errors.invalidTimezone',
        error: 'SETTINGS_INVALID_TIMEZONE',
      }),
    ).toBeNull();
  });

  it('rejects fixed offsets and invalid strings', () => {
    expect(() =>
      normalizeIanaTimeZoneInput('+02:00', {
        messageKey: 'settings.errors.invalidTimezone',
        error: 'SETTINGS_INVALID_TIMEZONE',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      normalizeIanaTimeZoneInput('UTC+2', {
        messageKey: 'settings.errors.invalidTimezone',
        error: 'SETTINGS_INVALID_TIMEZONE',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      normalizeIanaTimeZoneInput('Invalid/Timezone', {
        messageKey: 'settings.errors.invalidTimezone',
        error: 'SETTINGS_INVALID_TIMEZONE',
      }),
    ).toThrow(BadRequestException);
  });

  it('asserts required timezone input', () => {
    expect(
      assertIanaTimeZoneInput('Asia/Riyadh', {
        messageKey: 'availability.errors.invalidTimezone',
        error: 'AVAILABILITY_INVALID_TIMEZONE',
      }),
    ).toBe('Asia/Riyadh');

    expect(() =>
      assertIanaTimeZoneInput('  ', {
        messageKey: 'availability.errors.invalidTimezone',
        error: 'AVAILABILITY_INVALID_TIMEZONE',
      }),
    ).toThrow(BadRequestException);
  });
});
