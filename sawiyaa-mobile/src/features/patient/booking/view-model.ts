import type { PublicPractitionerDetails } from "../discovery/types";

export type BookingDuration = 30 | 60;

export type BookingDurationOption = {
  durationMinutes: BookingDuration;
  amount: number | null;
  currencyCode: string | null;
};

export function getSupportedBookingDurations(
  practitioner: PublicPractitionerDetails | null | undefined,
): BookingDurationOption[] {
  if (!practitioner) return [];

  return ([30, 60] as const)
    .map((durationMinutes) => ({
      durationMinutes,
      amount:
        durationMinutes === 30
          ? practitioner.sessionPrice30 ?? practitioner.displaySessionPrice30 ?? null
          : practitioner.sessionPrice60 ?? practitioner.displaySessionPrice60 ?? null,
      currencyCode: practitioner.currencyCode ?? null,
    }))
    .filter((option) => option.amount != null && Number(option.amount) > 0);
}

export function normalizeBookingDuration(value: string | string[] | undefined): BookingDuration {
  return value === "60" || (Array.isArray(value) && value[0] === "60") ? 60 : 30;
}

export function findNearestAvailableDayKey<T extends { dayKey: string; slots: unknown[] }>(
  days: T[],
): string | null {
  return days.find((day) => day.slots.length > 0)?.dayKey ?? days[0]?.dayKey ?? null;
}
