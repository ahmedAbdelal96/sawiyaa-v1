import { timeOptions, type DurationMinutes } from "./utils";

export type AvailabilityPeriod = "morning" | "afternoon" | "evening";

export function getAvailabilityPeriod(startMinuteOfDay: number): AvailabilityPeriod {
  if (startMinuteOfDay < 12 * 60) return "morning";
  if (startMinuteOfDay < 18 * 60) return "afternoon";
  return "evening";
}

export function groupAvailabilityTimeOptions(duration: DurationMinutes) {
  return (["morning", "afternoon", "evening"] as AvailabilityPeriod[]).map((period) => ({
    period,
    options: timeOptions(duration).filter((minute) => getAvailabilityPeriod(minute) === period),
  }));
}
