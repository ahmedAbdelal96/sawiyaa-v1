import type { AvailabilityWindow } from "./types";
import {
  formatViewerDate,
  formatViewerDateTime,
  formatViewerTime,
  getDatePartsInTimeZone,
  getEffectiveViewerTimeZone,
} from "../../../lib/time-formatting";

export interface SelectableSlot {
  startsAt: string;
  windowEndsAt: string;
  durationMinutes: 30 | 60 | null;
}

export interface DayGroup {
  dayKey: string;
  dayLabel: string;
  slots: SelectableSlot[];
}

const MIN_BOOKING_LEAD_MS = 60 * 1000;

export function getWeekRange(weekOffset: number) {
  const today = new Date();
  const from = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + weekOffset * 7,
    0,
    0,
    0,
    0,
  );
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    from,
    to,
  };
}

export function buildSlotsFromWindows(windows: AvailabilityWindow[]) {
  const slots: SelectableSlot[] = [];
  const earliestAllowedStart = Date.now() + MIN_BOOKING_LEAD_MS;

  for (const window of windows) {
    const startMs = new Date(window.startsAt).getTime();
    if (startMs <= earliestAllowedStart) {
      continue;
    }

    slots.push({
      startsAt: new Date(startMs).toISOString(),
      windowEndsAt: window.endsAt,
      durationMinutes:
        window.durationMinutes === 30 || window.durationMinutes === 60
          ? window.durationMinutes
          : null,
    });
  }

  return slots;
}

export function groupSlotsByDay(
  slots: SelectableSlot[],
  locale: string,
  _splitByTimeOfDay = false,
) {
  const map = new Map<string, DayGroup>();
  const timeZone = getEffectiveViewerTimeZone();

  for (const slot of slots) {
    const slotDate = new Date(slot.startsAt);
    const parts = getDatePartsInTimeZone(slotDate, timeZone);
    const dayKey = parts
      ? `${parts.year}-${parts.month}-${parts.day}`
      : "invalid";

    if (!map.has(dayKey)) {
      map.set(dayKey, {
        dayKey,
        dayLabel: formatViewerDate(slotDate, {
          locale,
          weekday: "short",
          day: "numeric",
          month: "short",
          fallbackText: "-",
        }),
        slots: [],
      });
    }

    map.get(dayKey)!.slots.push(slot);
  }

  const days = Array.from(map.values()).sort((a, b) =>
    a.dayKey.localeCompare(b.dayKey),
  );

  for (const day of days) {
    day.slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  return days;
}

export function splitDaySlotsByPart(daySlots: SelectableSlot[]) {
  const morning: SelectableSlot[] = [];
  const afternoon: SelectableSlot[] = [];
  const evening: SelectableSlot[] = [];

  for (const slot of daySlots) {
    const parts = getDatePartsInTimeZone(
      slot.startsAt,
      getEffectiveViewerTimeZone(),
    );
    const hour = parts?.hour ?? -1;
    if (hour < 12) {
      morning.push(slot);
    } else if (hour < 17) {
      afternoon.push(slot);
    } else {
      evening.push(slot);
    }
  }

  return { morning, afternoon, evening };
}

export function formatLocalizedDateTime(value: string, locale: string) {
  return formatViewerDateTime(value, { locale });
}

export function formatLocalizedDate(value: string, locale: string) {
  return formatViewerDate(value, { locale });
}

export function formatLocalizedTime(value: string, locale: string) {
  return formatViewerTime(value, { locale });
}

export function formatLocalizedDateRange(
  from: string,
  to: string,
  locale: string,
) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setDate(toDate.getDate() - 1);
  return `${formatViewerDate(fromDate, { locale })} - ${formatViewerDate(toDate, { locale })}`;
}
