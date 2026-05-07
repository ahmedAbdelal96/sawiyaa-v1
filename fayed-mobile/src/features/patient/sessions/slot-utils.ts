import type { AvailabilityWindow } from "./types";

export interface SelectableSlot {
  startsAt: string;
  windowEndsAt: string;
  maxDuration: 30 | 60;
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
  const halfHourMs = 30 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const slots: SelectableSlot[] = [];
  const earliestAllowedStart = Date.now() + MIN_BOOKING_LEAD_MS;

  for (const window of windows) {
    const startMs = new Date(window.startsAt).getTime();
    const endMs = new Date(window.endsAt).getTime();

    for (
      let cursor = startMs;
      cursor + halfHourMs <= endMs;
      cursor += halfHourMs
    ) {
      if (cursor <= earliestAllowedStart) {
        continue;
      }

      const remainingMs = endMs - cursor;
      slots.push({
        startsAt: new Date(cursor).toISOString(),
        windowEndsAt: window.endsAt,
        maxDuration: remainingMs >= hourMs ? 60 : 30,
      });
    }
  }

  return slots;
}

export function groupSlotsByDay(
  slots: SelectableSlot[],
  locale: string,
  splitByTimeOfDay = false,
) {
  const map = new Map<string, DayGroup>();
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  for (const slot of slots) {
    const slotDate = new Date(slot.startsAt);
    const dayKey = `${slotDate.getFullYear()}-${slotDate.getMonth() + 1}-${slotDate.getDate()}`;

    if (!map.has(dayKey)) {
      map.set(dayKey, {
        dayKey,
        dayLabel: dayFormatter.format(slotDate),
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
    const hour = new Date(slot.startsAt).getHours();
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
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  }).format(new Date(value));
}

export function formatLocalizedDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}

export function formatLocalizedTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  }).format(new Date(value));
}

export function formatLocalizedDateRange(
  from: string,
  to: string,
  locale: string,
) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setDate(toDate.getDate() - 1);

  const dayFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });
  const yearFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
  });

  return `${dayFormatter.format(fromDate)} - ${dayFormatter.format(toDate)}, ${yearFormatter.format(toDate)}`;
}
