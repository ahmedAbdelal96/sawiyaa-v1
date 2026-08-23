import { createTimeZoneOption } from "../../timezone/timezone-options";
import {
  getDatePartsInTimeZone,
  normalizeIanaTimeZone,
} from "../../../lib/time-formatting/time-formatting";
import type { AvailabilityWeekSlot } from "./types";
import type { DayOfWeek, DurationMinutes } from "./utils";

export type ScheduleDurationFilter = "all" | DurationMinutes;
export type ScheduleSlotStatus = "available" | "booked" | "notEditable";

export type ScheduleDay = {
  dayOfWeek: DayOfWeek;
  date: string;
  weekdayLabel: string;
  dayNumber: string;
  isToday: boolean;
};

export type ScheduleSummary = {
  available: number;
  booked: number;
  notEditable: number;
};

const DAY_COUNT = 7;

function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toCalendarDate(value: Date): string {
  return [value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .join("-");
}

export function getWeekDays(
  weekStartDate: string,
  locale: string,
  todayDate?: string | null,
): ScheduleDay[] {
  const start = parseCalendarDate(weekStartDate);
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    timeZone: "UTC",
  });
  const numberFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone: "UTC",
  });

  return Array.from({ length: DAY_COUNT }, (_, dayOfWeek) => {
    const date = new Date(start.getTime());
    date.setUTCDate(start.getUTCDate() + dayOfWeek);
    const dateValue = toCalendarDate(date);
    return {
      dayOfWeek: dayOfWeek as DayOfWeek,
      date: dateValue,
      weekdayLabel: weekdayFormatter.format(date),
      dayNumber: numberFormatter.format(date),
      isToday: dateValue === todayDate,
    };
  });
}

export function formatScheduleWeekRange(startDate: string, endDate: string, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${formatter.format(parseCalendarDate(startDate))} – ${formatter.format(parseCalendarDate(endDate))}`;
}

export function getTodayDateInTimeZone(timeZone: string | null | undefined): string | null {
  const parts = getDatePartsInTimeZone(new Date(), timeZone);
  if (!parts) return null;
  return [parts.year, parts.month, parts.day]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .join("-");
}

export function getTodayDayOfWeek(timeZone: string | null | undefined): DayOfWeek {
  return (getDatePartsInTimeZone(new Date(), timeZone)?.weekdayIndex ?? new Date().getDay()) as DayOfWeek;
}

export function getDefaultScheduleDay(isCurrentWeek: boolean, todayDay: DayOfWeek): DayOfWeek {
  return isCurrentWeek ? todayDay : 0;
}

export function filterScheduleSlots(
  slots: AvailabilityWeekSlot[],
  dayOfWeek: DayOfWeek,
  duration: ScheduleDurationFilter,
): AvailabilityWeekSlot[] {
  return slots
    .filter((slot) => slot.dayOfWeek === dayOfWeek)
    .filter((slot) => duration === "all" || slot.durationMinutes === duration)
    .sort((a, b) => a.startMinuteOfDay - b.startMinuteOfDay || a.durationMinutes - b.durationMinutes);
}

export function getSelectedWeekSlots(
  details: { weekStartDate: string; slots: AvailabilityWeekSlot[] } | null | undefined,
  selectedWeekStartDate: string | null | undefined,
): AvailabilityWeekSlot[] {
  if (!details || !selectedWeekStartDate || details.weekStartDate !== selectedWeekStartDate) return [];
  return details.slots;
}

export function getScheduleSlotStatus(slot: AvailabilityWeekSlot): ScheduleSlotStatus {
  if (slot.isBookedOrReserved || slot.reasonCode === "BOOKED") return "booked";
  if (
    slot.canEdit === false ||
    slot.canRemove === false ||
    slot.isPast === true ||
    slot.reasonCode === "PAST" ||
    slot.reasonCode === "ARCHIVED"
  ) {
    return "notEditable";
  }
  return "available";
}

export function summarizeScheduleSlots(slots: AvailabilityWeekSlot[]): ScheduleSummary {
  return slots.reduce<ScheduleSummary>(
    (summary, slot) => {
      const status = getScheduleSlotStatus(slot);
      summary[status] += 1;
      return summary;
    },
    { available: 0, booked: 0, notEditable: 0 },
  );
}

export function formatScheduleTimeZoneLabel(
  timeZone: string | null | undefined,
  locale: string,
  referenceDate: Date,
): string | null {
  const normalized = normalizeIanaTimeZone(timeZone);
  if (!normalized) return null;

  const timeZoneLocale = locale.toLowerCase().startsWith("ar") ? "ar" : "en";
  const option = createTimeZoneOption(normalized, timeZoneLocale);
  const localizedCityLabels: Record<string, { ar: string; en: string }> = {
    "Africa/Cairo": { ar: "القاهرة", en: "Cairo" },
    "Asia/Riyadh": { ar: "الرياض", en: "Riyadh" },
    "Asia/Dubai": { ar: "دبي", en: "Dubai" },
    "Asia/Kuwait": { ar: "الكويت", en: "Kuwait" },
    "Asia/Amman": { ar: "عمّان", en: "Amman" },
  };
  const cityLabel = localizedCityLabels[normalized]?.[timeZoneLocale] ?? option?.city ?? null;
  if (!cityLabel) return null;

  // The Schedule screen keeps timezone context secondary and human-readable.
  // The actual timezone remains dynamically derived from the account/week data.
  void referenceDate;
  return cityLabel;
}
