import type { PublicAvailabilityWindow } from "../types/public-availability.types";

export type ProjectedAvailabilitySlot = {
  startsAt: string;
  windowEndsAt: string;
  maxDuration: 30 | 60;
};

const MIN_BOOKING_LEAD_MS = 60 * 1000;
const SLOT_STEP_MS = 30 * 60 * 1000;

/** Project Backend windows into concrete, genuinely bookable starts. */
export function projectAvailabilityWindow(
  window: PublicAvailabilityWindow,
  now = new Date(),
): ProjectedAvailabilitySlot[] {
  const startTime = new Date(window.startsAt).getTime();
  const endTime = new Date(window.endsAt).getTime();
  const earliestAllowedStart = now.getTime() + MIN_BOOKING_LEAD_MS;

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return [];
  }

  // A published 60-minute slot is an exact booking opportunity. Do not
  // invent a second start inside it, and do not move it forward when the
  // Backend clipped a past slot at the current instant.
  if (window.durationMinutes === 60) {
    if (startTime <= earliestAllowedStart || endTime - startTime < 60 * 60 * 1000) {
      return [];
    }

    return [{
      startsAt: new Date(startTime).toISOString(),
      windowEndsAt: window.endsAt,
      maxDuration: 60,
    }];
  }

  // The Backend may merge adjacent 30-minute published slots into one
  // continuous window. Project each real half-hour boundary so a clipped
  // current slot does not hide the future starts that remain bookable.
  if (window.durationMinutes === null) {
    if (startTime <= earliestAllowedStart) {
      return [];
    }

    return [{
      startsAt: new Date(startTime).toISOString(),
      windowEndsAt: window.endsAt,
      maxDuration: endTime - startTime >= 60 * 60 * 1000 ? 60 : 30,
    }];
  }

  const firstBoundary = Math.ceil(startTime / SLOT_STEP_MS) * SLOT_STEP_MS;
  const firstAllowedBoundary = Math.ceil(earliestAllowedStart / SLOT_STEP_MS) * SLOT_STEP_MS;
  const firstStart = Math.max(firstBoundary, firstAllowedBoundary);
  const slots: ProjectedAvailabilitySlot[] = [];

  for (let current = firstStart; current + SLOT_STEP_MS <= endTime; current += SLOT_STEP_MS) {
    const remaining = endTime - current;
    slots.push({
      startsAt: new Date(current).toISOString(),
      windowEndsAt: window.endsAt,
      maxDuration: 30,
    });
  }

  return slots;
}
