export type AvailabilityWeekUiStatus = "NOT_SET" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type AvailabilityWeekSlot = {
  id: string;
  dayOfWeek: number;
  weekday?: string;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  durationMinutes: 30 | 60;
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
  canEdit?: boolean;
  canRemove?: boolean;
  isPast?: boolean;
  isBookedOrReserved?: boolean;
  reasonCode?: "PAST" | "BOOKED" | "ARCHIVED";
};

export type AvailabilityWeekSlotInput = Pick<AvailabilityWeekSlot, "dayOfWeek" | "durationMinutes" | "startMinuteOfDay" | "endMinuteOfDay">;

export type AvailabilityWeek = {
  id: string | null;
  weekStartDate: string;
  weekEndDate: string;
  timezone: string;
  status: AvailabilityWeekUiStatus;
  copiedFromWeekId?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  isEditable: boolean;
  hasSlots: boolean;
  slots: AvailabilityWeekSlot[];
};

export type AvailabilityWeekWindowEntry = {
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
};

export type AvailabilityRollingWindowData = {
  timezone: string | null;
  weekStartsOn: "SUNDAY";
  futureWeeksAllowed: number;
  activeRange: { startWeekDate: string; endWeekDate: string };
  weeks: AvailabilityWeekWindowEntry[];
};

export type AvailabilityWeekMutationData = {
  message: string;
  timezone: string;
  week: AvailabilityWeek;
  weeks: AvailabilityWeekWindowEntry[];
};

export type AvailabilityWeekDetailsData = {
  message: string;
  week: AvailabilityWeek;
  canPublish: boolean;
  containsBookings: boolean;
  slotCount30Minutes: number;
  slotCount60Minutes: number;
};

export type AvailabilityRepeatReasonCode =
  | "ELIGIBLE" | "TARGET_ALREADY_EXISTS" | "TARGET_PUBLISHED" | "TARGET_HAS_BOOKINGS"
  | "TARGET_CHANGED_SINCE_PREVIEW" | "TARGET_OUT_OF_ACTIVE_RANGE" | "TARGET_NOT_FUTURE"
  | "TARGET_NOT_SUNDAY" | "TARGET_EQUALS_SOURCE" | "TARGET_DUPLICATED" | "INVALID_TIMEZONE"
  | "SOURCE_NOT_FOUND" | "SOURCE_HAS_NO_SESSION_TIMES" | "SOURCE_OUT_OF_ACTIVE_RANGE"
  | "DST_INVALID_TIME" | "DST_AMBIGUOUS_TIME" | "SOURCE_CHANGED_SINCE_PREVIEW"
  | "REPEAT_PREVIEW_EXPIRED" | "IDEMPOTENCY_CONFLICT" | "REPEAT_IN_PROGRESS";

export type AvailabilityRepeatTarget = {
  weekStartDate: string;
  reasonCode: AvailabilityRepeatReasonCode;
  classification: "ELIGIBLE" | "SKIPPED" | "INVALID";
  copiedSlotCount: number;
};

export type AvailabilityRepeatPreview = {
  operationId: string;
  expiresAt: string;
  sourceWeekId: string;
  timezone: string;
  activeRange: { startWeekDate: string; endWeekDate: string };
  sourceSlotCount30Minutes: number;
  sourceSlotCount60Minutes: number;
  targets: AvailabilityRepeatTarget[];
  confirmationAllowed: boolean;
};

export type AvailabilityRepeatConfirmation = {
  operationId: string;
  status: "COMPLETED" | "FAILED" | "PROCESSING";
  targets: AvailabilityRepeatTarget[];
  warnings: string[];
};

export type BookingSettings = {
  acceptsNormalBookings: boolean;
  isInstantBookingEnabled: boolean;
};
