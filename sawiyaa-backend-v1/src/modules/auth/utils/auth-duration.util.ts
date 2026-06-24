import ms, { StringValue } from 'ms';

/**
 * Auth uses duration strings from config for JWT expiry.
 * This helper turns those strings into absolute dates for API responses and session persistence.
 */
export function addDuration(from: Date, duration: string): Date {
  const parsedDuration = ms(duration as StringValue);

  if (parsedDuration === undefined) {
    throw new Error(`Invalid auth duration: ${duration}`);
  }

  return new Date(from.getTime() + parsedDuration);
}
