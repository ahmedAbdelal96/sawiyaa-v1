/**
 * Availability view/domain types keep schedule logic explicit and decoupled from raw Prisma payloads.
 * Sessions and instant-booking modules can later consume these stable shapes without inheriting controller concerns.
 */
export interface WeeklyAvailabilitySlotDraftInput {
  dayOfWeek: number;
  durationMinutes?: 30 | 60;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
}

export type WeeklyAvailabilityDurationMinutes = 30 | 60;

export interface WeeklyAvailabilitySlotInput {
  dayOfWeek: number;
  durationMinutes: WeeklyAvailabilityDurationMinutes;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
}

export interface AvailabilityWindow {
  startsAt: string;
  endsAt: string;
  durationMinutes?: number | null;
}
