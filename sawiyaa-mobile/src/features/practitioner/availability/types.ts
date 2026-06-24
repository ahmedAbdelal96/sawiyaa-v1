export interface WeeklyAvailabilitySlot {
  id: string;
  dayOfWeek: number;
  weekday: string;
  durationMinutes: 30 | 60;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  timezone: string;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface AvailabilityException {
  id: string;
  type: "BLOCK" | "OPEN_EXTRA";
  startsAt: string;
  endsAt: string;
  reason: string | null;
  source: string;
  isActive: boolean;
}

export interface AvailabilityData {
  message: string;
  timezone: string;
  weeklySlots: WeeklyAvailabilitySlot[];
  exceptions: AvailabilityException[];
}

export type AvailabilityExceptionType = "BLOCK" | "OPEN_EXTRA";

export interface ReplaceWeeklyAvailabilityInput {
  timezone: string;
  slots: Array<{
    dayOfWeek: number;
    durationMinutes: 30 | 60;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
  }>;
}

export interface CreateAvailabilityExceptionInput {
  type: AvailabilityExceptionType;
  startsAt: string;
  endsAt: string;
  reason?: string;
}

export interface UpdateAvailabilityExceptionInput {
  type?: AvailabilityExceptionType;
  startsAt?: string;
  endsAt?: string;
  reason?: string;
}

export interface AvailabilityResponse {
  success: true;
  data: AvailabilityData;
}
