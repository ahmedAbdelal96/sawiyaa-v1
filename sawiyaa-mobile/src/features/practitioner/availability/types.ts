export type AvailabilityWeekUiStatus = "NOT_SET" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface AvailabilityWeekSlot {
  id?: string;
  dayOfWeek: number; // 0 Sunday, 6 Saturday
  durationMinutes: 30 | 60;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  canEdit?: boolean;
  canRemove?: boolean;
  isPast?: boolean;
  isBookedOrReserved?: boolean;
  reasonCode?: "PAST" | "BOOKED" | "ARCHIVED";
}

export interface AvailabilityWeek {
  id: string | null;
  weekStartDate: string; // YYYY-MM-DD
  weekEndDate: string; // YYYY-MM-DD
  timezone: string;
  status: AvailabilityWeekUiStatus;
  isEditable: boolean;
  hasSlots: boolean;
  slots: AvailabilityWeekSlot[];
}

export interface AvailabilityWeekOverview {
  timezone: string;
  currentWeek: AvailabilityWeek;
  nextWeek: AvailabilityWeek;
  reminderState?: string;
  shouldPromptForNextWeek?: boolean;
  daysUntilCurrentWeekEnds?: number;
}

export interface AvailabilityWeekMutationResponse {
  message: string;
  week: AvailabilityWeek;
  timezone: string;
  currentWeek: AvailabilityWeek;
  nextWeek: AvailabilityWeek;
  reminderState?: string;
  shouldPromptForNextWeek?: boolean;
  daysUntilCurrentWeekEnds?: number;
}
