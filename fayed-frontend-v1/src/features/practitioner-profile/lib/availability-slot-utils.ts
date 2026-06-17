import { formatViewerDate, formatViewerDateTime, formatViewerTime } from "@/lib/time-formatting";
import type { PublicAvailabilityWindow } from "../types/public-availability.types";

export function getWeekBounds(weekOffset: number): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() + weekOffset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function formatWeekLabel(from: string, to: string, numLocale: string): string {
  const start = new Date(from);
  const end = new Date(to);
  end.setDate(end.getDate() - 1);
  return `${formatViewerDate(start, { locale: numLocale })} - ${formatViewerDate(end, {
    locale: numLocale,
  })}`;
}

export function formatDayLabel(isoString: string, numLocale: string): string {
  return formatViewerDate(isoString, { locale: numLocale });
}

export function formatTimeLabel(isoString: string, numLocale: string): string {
  return formatViewerTime(isoString, { locale: numLocale });
}

export function normalizeUtcIso(isoString: string): string {
  return new Date(isoString).toISOString();
}

export function formatFullDatetime(isoString: string | null, numLocale: string): string {
  return formatViewerDateTime(isoString, { locale: numLocale });
}

export type SelectableSlot = {
  startsAt: string;
  windowEndsAt: string;
  maxDuration: 30 | 60;
};

const MIN_BOOKING_LEAD_MS = 60 * 1000;

export type DayGroup = {
  sortKey: string;
  dayLabel: string;
  slots: SelectableSlot[];
};

export function formatSlotCountLabel(count: number, locale: string): string {
  if (locale.startsWith("ar")) {
    if (count === 1) {
      return `1 \u0645\u0648\u0639\u062f \u0645\u062a\u0627\u062d`;
    }
    if (count === 2) {
      return `2 \u0645\u0648\u0639\u062f\u0627\u0646 \u0645\u062a\u0627\u062d\u0627\u0646`;
    }
    if (count >= 3 && count <= 10) {
      return `${count} \u0645\u0648\u0627\u0639\u064a\u062f \u0645\u062a\u0627\u062d\u0629`;
    }
    return `${count} \u0645\u0648\u0639\u062f\u064b\u0627 \u0645\u062a\u0627\u062d\u064b\u0627`;
  }

  return count === 1 ? "1 available slot" : `${count} available slots`;
}

export function formatNoDurationSlotsLabel(durationMinutes: 30 | 60, locale: string): string {
  if (locale.startsWith("ar")) {
    return durationMinutes === 30
      ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0648\u0627\u0639\u064a\u062f \u0645\u062a\u0627\u062d\u0629 \u0644\u062c\u0644\u0633\u0629 30 \u062f\u0642\u064a\u0642\u0629 \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639."
      : "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0648\u0627\u0639\u064a\u062f \u0645\u062a\u0627\u062d\u0629 \u0644\u062c\u0644\u0633\u0629 60 \u062f\u0642\u064a\u0642\u0629 \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639.";
  }

  return durationMinutes === 30
    ? "No 30-minute slots are available this week."
    : "No 60-minute slots are available this week.";
}

export function buildSlotsFromWindow(window: PublicAvailabilityWindow): SelectableSlot[] {
  const slots: SelectableSlot[] = [];
  const startTime = new Date(window.startsAt).getTime();
  const endTime = new Date(window.endsAt).getTime();
  const halfHourMs = 30 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const earliestAllowedStart = Date.now() + MIN_BOOKING_LEAD_MS;

  for (let current = startTime; current + halfHourMs <= endTime; current += halfHourMs) {
    if (current <= earliestAllowedStart) {
      continue;
    }

    const remaining = endTime - current;
    slots.push({
      startsAt: new Date(current).toISOString(),
      windowEndsAt: window.endsAt,
      maxDuration: remaining >= hourMs ? 60 : 30,
    });
  }

  return slots;
}

export function groupByLocalDay(windows: PublicAvailabilityWindow[], numLocale: string): DayGroup[] {
  const map = new Map<
    string,
    {
      sortKey: string;
      dayLabel: string;
      slots: Map<string, SelectableSlot>;
    }
  >();

  for (const window of windows) {
    const slots = buildSlotsFromWindow(window);
    for (const slot of slots) {
      const d = new Date(slot.startsAt);
      const sortKey = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-");

      if (!map.has(sortKey)) {
        map.set(sortKey, {
          sortKey,
          dayLabel: formatDayLabel(slot.startsAt, numLocale),
          slots: new Map<string, SelectableSlot>(),
        });
      }

      const dayGroup = map.get(sortKey)!;
      const existingSlot = dayGroup.slots.get(slot.startsAt);

      if (!existingSlot) {
        dayGroup.slots.set(slot.startsAt, slot);
        continue;
      }

      if (
        slot.maxDuration > existingSlot.maxDuration ||
        new Date(slot.windowEndsAt).getTime() > new Date(existingSlot.windowEndsAt).getTime()
      ) {
        dayGroup.slots.set(slot.startsAt, {
          ...existingSlot,
          windowEndsAt: slot.windowEndsAt,
          maxDuration: Math.max(existingSlot.maxDuration, slot.maxDuration) as 30 | 60,
        });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((group) => ({
      ...group,
      slots: Array.from(group.slots.values()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }));
}
