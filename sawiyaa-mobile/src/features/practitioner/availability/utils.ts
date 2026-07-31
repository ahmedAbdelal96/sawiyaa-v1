import type { AvailabilityWeekSlot, AvailabilityWeekSlotInput } from "./types";

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type DurationMinutes = 30 | 60;
export type SelectedTimes = Record<DurationMinutes, Record<DayOfWeek, number[]>>;

export function emptySelectedTimes(): SelectedTimes {
  return { 30: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }, 60: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] } };
}

export function slotsToSelectedTimes(slots: Pick<AvailabilityWeekSlot, "dayOfWeek" | "durationMinutes" | "startMinuteOfDay">[]): SelectedTimes {
  const result = emptySelectedTimes();
  for (const slot of slots) {
    const duration = slot.durationMinutes === 60 ? 60 : 30;
    const day = slot.dayOfWeek as DayOfWeek;
    if (result[duration][day] && !result[duration][day].includes(slot.startMinuteOfDay)) result[duration][day].push(slot.startMinuteOfDay);
  }
  return result;
}

export function selectedTimesToSlots(value: SelectedTimes): AvailabilityWeekSlotInput[] {
  return ([30, 60] as DurationMinutes[]).flatMap((duration) =>
    ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).flatMap((dayOfWeek) =>
      value[duration][dayOfWeek].map((startMinuteOfDay) => ({ dayOfWeek, durationMinutes: duration, startMinuteOfDay, endMinuteOfDay: startMinuteOfDay + duration })),
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
