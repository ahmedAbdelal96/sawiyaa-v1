import type { AvailabilityWeekSlot, AvailabilityWeekSlotInput } from "./types";

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type DurationMinutes = 30 | 60;
export type SelectedTimes = Record<DurationMinutes, Record<DayOfWeek, number[]>>;

export type SelectedTimesInitialization = {
  selected: SelectedTimes;
  invalidLegacy60Starts: number[];
  invalidLegacy60Slots: Array<Pick<AvailabilityWeekSlot, "dayOfWeek" | "startMinuteOfDay" | "endMinuteOfDay">>;
};

export function emptySelectedTimes(): SelectedTimes {
  return { 30: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }, 60: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] } };
}

export function slotsToSelectedTimes(slots: Pick<AvailabilityWeekSlot, "dayOfWeek" | "durationMinutes" | "startMinuteOfDay" | "endMinuteOfDay">[]): SelectedTimesInitialization {
  const result = emptySelectedTimes();
  const invalidLegacy60Starts: number[] = [];
  const invalidLegacy60Slots: SelectedTimesInitialization["invalidLegacy60Slots"] = [];
  for (const slot of slots) {
    const duration = slot.durationMinutes === 60 ? 60 : 30;
    const day = slot.dayOfWeek as DayOfWeek;
    if (duration === 60 && slot.startMinuteOfDay % 60 !== 0) {
      invalidLegacy60Starts.push(slot.startMinuteOfDay);
      invalidLegacy60Slots.push({
        dayOfWeek: slot.dayOfWeek,
        startMinuteOfDay: slot.startMinuteOfDay,
        endMinuteOfDay: slot.endMinuteOfDay ?? slot.startMinuteOfDay + 60,
      });
      continue;
    }
    if (result[duration][day] && !result[duration][day].includes(slot.startMinuteOfDay)) result[duration][day].push(slot.startMinuteOfDay);
  }
  return { selected: result, invalidLegacy60Starts, invalidLegacy60Slots };
}

export function selectedTimesToSlots(value: SelectedTimes): AvailabilityWeekSlotInput[] {
  return ([30, 60] as DurationMinutes[]).flatMap((duration) =>
    ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).flatMap((dayOfWeek) =>
      value[duration][dayOfWeek]
        .filter((startMinuteOfDay) => startMinuteOfDay % duration === 0)
        .map((startMinuteOfDay) => ({ dayOfWeek, durationMinutes: duration, startMinuteOfDay, endMinuteOfDay: startMinuteOfDay + duration })),
    ),
  );
}

export function selectedTimesEqual(a: SelectedTimes, b: SelectedTimes) {
  return ([30, 60] as DurationMinutes[]).every((duration) => ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).every((day) => a[duration][day].join(",") === b[duration][day].join(",")));
}

export function timeOptions(duration: DurationMinutes) {
  const limit = duration === 30 ? 48 : 24;
  return Array.from({ length: limit }, (_, index) => index * duration);
}

export function formatMinuteRange(start: number, duration: number, rtl: boolean) {
  const toTime = (minute: number) => {
    const hours = Math.floor(minute / 60);
    const mins = minute % 60;
    const suffix = hours >= 12 ? (rtl ? "م" : "PM") : (rtl ? "ص" : "AM");
    const hour = hours % 12 || 12;
    return `${hour}:${String(mins).padStart(2, "0")} ${suffix}`;
  };
  const isolate = (value: string) => rtl ? `\u2066${value}\u2069` : value;
  return rtl
    ? `من ${isolate(toTime(start))} إلى ${isolate(toTime(start + duration))}`
    : `${isolate(toTime(start))} – ${isolate(toTime(start + duration))}`;
}

export function formatWeekRange(start: string, end: string, locale: string) {
  const parse = (value: string) => new Date(`${value}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${formatter.format(parse(start))} - ${formatter.format(parse(end))}`;
}
