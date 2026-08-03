import { BadRequestException } from '@nestjs/common';
import {
  assertDateOnly,
  assertIanaTimeZoneInput,
  assertOffsetQualifiedIsoInstant,
  getZonedDateTimeParts,
  isValidIanaTimeZone,
  normalizeIanaTimeZoneInput,
  zonedDateTimeToUtc,
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

  it('resolves Africa/Cairo with date-specific DST rules', () => {
    expect(
      getZonedDateTimeParts(
        new Date('2026-04-23T10:00:00.000Z'),
        'Africa/Cairo',
      ),
    ).toMatchObject({ hour: 12, minute: 0 });
    expect(
      getZonedDateTimeParts(
        new Date('2026-04-24T10:00:00.000Z'),
        'Africa/Cairo',
      ),
    ).toMatchObject({ hour: 13, minute: 0 });
  });

  it('accepts offset-qualified instants and rejects offset-less values', () => {
    expect(
      assertOffsetQualifiedIsoInstant('2026-08-10T07:00:00.000Z').toISOString(),
    ).toBe('2026-08-10T07:00:00.000Z');
    expect(
      assertOffsetQualifiedIsoInstant(
        '2026-08-10T10:00:00+03:00',
      ).toISOString(),
    ).toBe('2026-08-10T07:00:00.000Z');
    expect(() =>
      assertOffsetQualifiedIsoInstant('2026-08-10T10:00:00'),
    ).toThrow(BadRequestException);
  });

  it('keeps date-only values as calendar dates', () => {
    expect(assertDateOnly('2026-08-10')).toBe('2026-08-10');
    expect(() => assertDateOnly('2026-02-30')).toThrow(BadRequestException);
  });

  it('converts a local wall-clock value across a UTC day boundary', () => {
    expect(
      zonedDateTimeToUtc(
        { year: 2026, month: 8, day: 10, hour: 0, minute: 30 },
        'Asia/Riyadh',
      ).toISOString(),
    ).toBe('2026-08-09T21:30:00.000Z');
  });
});
