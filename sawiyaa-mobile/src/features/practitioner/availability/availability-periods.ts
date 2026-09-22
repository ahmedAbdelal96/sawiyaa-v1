import type { DurationMinutes } from "./utils";

export type AvailabilityPeriodState = "editable" | "booked" | "protected";

export type AvailabilityPeriodSlot = {
  startMinuteOfDay: number;
  durationMinutes: DurationMinutes;
  state: AvailabilityPeriodState;
};

export type AvailabilityPeriod = {
  id: string;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  durationMinutes: DurationMinutes;
  state: AvailabilityPeriodState;
  slotStarts: number[];
};

/**
 * Groups only adjacent slots with the same duration and editability state.
 * This is a presentation model; the API continues to receive discrete slots.
 */
export function groupAvailabilityPeriods(slots: AvailabilityPeriodSlot[]): AvailabilityPeriod[] {
  const sorted = [...slots].sort((a, b) => a.startMinuteOfDay - b.startMinuteOfDay || a.durationMinutes - b.durationMinutes);
  const periods: AvailabilityPeriod[] = [];

  for (const slot of sorted) {
    const previous = periods[periods.length - 1];
    const canExtend = previous
      && previous.durationMinutes === slot.durationMinutes
      && previous.state === slot.state
      && previous.endMinuteOfDay === slot.startMinuteOfDay;

    if (canExtend) {
      previous.endMinuteOfDay = slot.startMinuteOfDay + slot.durationMinutes;
      previous.slotStarts.push(slot.startMinuteOfDay);
      continue;
    }

    periods.push({
      id: `${slot.state}:${slot.durationMinutes}:${slot.startMinuteOfDay}`,
      startMinuteOfDay: slot.startMinuteOfDay,
      endMinuteOfDay: slot.startMinuteOfDay + slot.durationMinutes,
      durationMinutes: slot.durationMinutes,
      state: slot.state,
      slotStarts: [slot.startMinuteOfDay],
    });
  }

  return periods;
}
