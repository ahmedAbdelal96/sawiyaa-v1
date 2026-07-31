export const AVAILABILITY_DURATIONS = [30, 60] as const;
export type AvailabilityDuration = (typeof AVAILABILITY_DURATIONS)[number];

export type AvailabilityTimeOption = {
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  durationMinutes: AvailabilityDuration;
  label: string;
};

function clockLabel(minuteOfDay: number) {
  const normalized = minuteOfDay % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function generateAvailabilityTimeOptions(durationMinutes: AvailabilityDuration): AvailabilityTimeOption[] {
  const step = durationMinutes === 30 ? 30 : 60;
  const count = durationMinutes === 30 ? 48 : 24;
  return Array.from({ length: count }, (_, index) => {
    const startMinuteOfDay = index * step;
    const endMinuteOfDay = startMinuteOfDay + durationMinutes;
    return {
      startMinuteOfDay,
      endMinuteOfDay,
      durationMinutes,
      label: `${clockLabel(startMinuteOfDay)} \u2013 ${clockLabel(endMinuteOfDay)}`,
    };
  });
}

export function canFitAvailabilityDuration(startMinuteOfDay: number, duration: AvailabilityDuration) {
  return startMinuteOfDay + duration <= 24 * 60;
}
