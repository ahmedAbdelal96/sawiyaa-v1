import { AVAILABILITY_WEEK_MAX_SLOTS, generateAvailabilityTimeOptions } from './availability-time-grid';
import { describe, expect, it } from 'vitest';

describe('availability weekly capacity', () => {
  it('matches the canonical maximum and exposes every valid start', () => {
    expect(generateAvailabilityTimeOptions(30)).toHaveLength(48);
    expect(generateAvailabilityTimeOptions(60)).toHaveLength(24);
    expect(7 * (48 + 24)).toBe(AVAILABILITY_WEEK_MAX_SLOTS);
  });
});
