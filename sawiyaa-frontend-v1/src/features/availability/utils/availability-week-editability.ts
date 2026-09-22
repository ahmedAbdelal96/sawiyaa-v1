import type { AvailabilityWeekSlot, AvailabilityWeekWindowEntry } from "../types/availability.types";

export function canEditAvailabilityWeek(
  week: Pick<AvailabilityWeekWindowEntry, "status" | "canCreate">,
): boolean {
  return week.status === "DRAFT" || week.status === "PUBLISHED" || (week.status === "NOT_SET" && week.canCreate);
}

export function canEditAvailabilitySlot(slot: Pick<AvailabilityWeekSlot, "canEdit" | "canRemove" | "isPast" | "isBookedOrReserved">): boolean {
  return slot.canEdit !== false && slot.canRemove !== false && slot.isPast !== true && slot.isBookedOrReserved !== true;
}

function calendarDateFromWeekStart(weekStartDate: string, dayOfWeek: number): string {
  const [year, month, day] = weekStartDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dayOfWeek));
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .join("-");
}

export function isAvailabilityStartInPast(
  weekStartDate: string,
  timeZone: string,
  dayOfWeek: number,
  startMinuteOfDay: number,
  now: Date = new Date(),
): boolean {
  let parts: Record<string, number> = {};
  try {
    for (const part of new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now)) {
      if (part.type !== "literal") parts[part.type] = Number(part.value);
    }
  } catch {
    return false;
  }
  const today = [parts.year, parts.month, parts.day]
    .map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, "0")))
    .join("-");
  const slotDate = calendarDateFromWeekStart(weekStartDate, dayOfWeek);
  if (slotDate < today) return true;
  if (slotDate > today) return false;
  return startMinuteOfDay <= parts.hour * 60 + parts.minute;
}
