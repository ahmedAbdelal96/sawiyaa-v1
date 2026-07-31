import { AvailabilityWeekStatus, AvailabilityWeekday } from '@prisma/client';

export type AvailabilityWeekUiStatus = AvailabilityWeekStatus | 'NOT_SET';

export type AvailabilityWeekReminderState =
  | 'NONE'
  | 'CURRENT_WEEK_MISSING'
  | 'NEXT_WEEK_MISSING'
  | 'DRAFT_EXISTS';

export interface AvailabilityWeekSlotViewModel {
  id: string;
  dayOfWeek: number;
  weekday: AvailabilityWeekday;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  durationMinutes: number;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  canEdit?: boolean;
  canRemove?: boolean;
  isPast?: boolean;
  isBookedOrReserved?: boolean;
  reasonCode?: 'PAST' | 'BOOKED' | 'ARCHIVED';
}

export interface AvailabilityWeekViewModel {
  id: string | null;
  weekStartDate: string;
  weekEndDate: string;
  timezone: string;
  status: AvailabilityWeekUiStatus;
  copiedFromWeekId: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isEditable: boolean;
  hasSlots: boolean;
  slots: AvailabilityWeekSlotViewModel[];
}

export interface AvailabilityWeekOverviewViewModel {
  timezone: string;
  weekStartsOn?: 'SUNDAY';
  futureWeeksAllowed?: number;
  activeRange?: {
    startWeekDate: string;
    endWeekDate: string;
  };
  weeks?: AvailabilityWeekWindowEntryViewModel[];
  currentWeek: AvailabilityWeekViewModel;
  nextWeek: AvailabilityWeekViewModel;
  reminderState: AvailabilityWeekReminderState;
  shouldPromptForNextWeek: boolean;
  daysUntilCurrentWeekEnds: number | null;
  nextWeekPublished: boolean;
}

export interface AvailabilityWeekWindowEntryViewModel {
  weekId: string | null;
  weekStartDate: string;
  weekEndDate: string;
  status: AvailabilityWeekUiStatus;
  isCurrentWeek: boolean;
  relativeWeekIndex: number;
  canCreate: boolean;
  canEdit: boolean;
  canPublish: boolean;
  containsBookings: boolean;
  slotCount: number;
  slotCount30Minutes: number;
  slotCount60Minutes: number;
  copiedFromWeekId: string | null;
}
