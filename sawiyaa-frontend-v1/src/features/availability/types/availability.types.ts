export type AvailabilityWeekUiStatus = "NOT_SET" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type AvailabilityWeekReminderState =
  | "NONE"
  | "CURRENT_WEEK_MISSING"
  | "NEXT_WEEK_MISSING"
  | "DRAFT_EXISTS";

export type AvailabilityWeekSlot = {
  id: string;
  dayOfWeek: number;
  weekday: string;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  durationMinutes: 30 | 60;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type AvailabilityWeek = {
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
  slots: AvailabilityWeekSlot[];
};

export type AvailabilityWeekOverview = {
  timezone: string;
  currentWeek: AvailabilityWeek;
  nextWeek: AvailabilityWeek;
  reminderState: AvailabilityWeekReminderState;
  shouldPromptForNextWeek: boolean;
  daysUntilCurrentWeekEnds: number | null;
  nextWeekPublished: boolean;
};

export type AvailabilityWeekMutationData = {
  message: string;
  timezone: string;
  week: AvailabilityWeek;
  currentWeek: AvailabilityWeek;
  nextWeek: AvailabilityWeek;
  reminderState: AvailabilityWeekReminderState;
  shouldPromptForNextWeek: boolean;
  daysUntilCurrentWeekEnds: number | null;
  nextWeekPublished: boolean;
};

export type AvailabilityWorkspaceData = {
  weeks: AvailabilityWeekOverview;
};
