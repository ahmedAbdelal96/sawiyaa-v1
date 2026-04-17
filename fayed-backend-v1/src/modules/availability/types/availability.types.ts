import {
  AvailabilityExceptionSource,
  AvailabilityExceptionType,
  AvailabilityWeekday,
} from '@prisma/client';

/**
 * Availability view/domain types keep schedule logic explicit and decoupled from raw Prisma payloads.
 * Sessions and instant-booking modules can later consume these stable shapes without inheriting controller concerns.
 */
export interface WeeklyAvailabilitySlotInput {
  dayOfWeek: number;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
}

export interface WeeklyAvailabilitySlotViewModel {
  id: string;
  dayOfWeek: number;
  weekday: AvailabilityWeekday;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  timezone: string;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface AvailabilityExceptionViewModel {
  id: string;
  type: AvailabilityExceptionType;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  source: AvailabilityExceptionSource;
  isActive: boolean;
}

export interface AvailabilityWindow {
  startsAt: string;
  endsAt: string;
}

export interface AvailabilityCombinedViewModel {
  timezone: string;
  weeklySlots: WeeklyAvailabilitySlotViewModel[];
  exceptions: AvailabilityExceptionViewModel[];
}
