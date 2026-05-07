/**
 * Frontend types for the Availability module.
 * Derived directly from backend DTOs:
 *   - WeeklyAvailabilitySlotResponseDto
 *   - AvailabilityExceptionResponseDto
 *   - MyAvailabilityDataResponseDto / AvailabilityMutationDataResponseDto
 *   - ReplaceWeeklyAvailabilityDto
 *   - CreateAvailabilityExceptionDto
 */

export type WeeklyAvailabilitySlot = {
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
};

export type AvailabilityExceptionType = "BLOCK" | "OPEN_EXTRA";

export type AvailabilityException = {
  id: string;
  type: AvailabilityExceptionType;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  source: string;
  isActive: boolean;
};

/**
 * Shape returned by GET /practitioners/me/availability (after extractData).
 * Also returned by all mutation endpoints (PUT weekly-slots, POST/PATCH/DELETE exceptions).
 */
export type MyAvailabilityData = {
  message: string;
  timezone: string;
  weeklySlots: WeeklyAvailabilitySlot[];
  exceptions: AvailabilityException[];
};

/** Payload for PUT /practitioners/me/availability/weekly-slots */
export type ReplaceWeeklyAvailabilityInput = {
  timezone: string;
  slots: {
    dayOfWeek: number;
    durationMinutes: 30 | 60;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
  }[];
};

/** Payload for POST /practitioners/me/availability/exceptions */
export type CreateAvailabilityExceptionInput = {
  type: AvailabilityExceptionType;
  startsAt: string;
  endsAt: string;
  reason?: string;
};
