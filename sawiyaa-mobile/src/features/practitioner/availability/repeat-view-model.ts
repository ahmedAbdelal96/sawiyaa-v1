import type {
  AvailabilityRepeatReasonCode,
  AvailabilityRepeatTarget,
  AvailabilityWeekWindowEntry,
} from "./types";

export type RepeatTargetWindowState = "eligible" | "conflict" | "blocked";

export function getRepeatTargetWindowState(
  week: Pick<AvailabilityWeekWindowEntry, "canCreate" | "containsBookings" | "status" | "weekId">,
): RepeatTargetWindowState {
  if (week.canCreate) return "eligible";
  if (week.containsBookings) return "conflict";
  return "blocked";
}

export function getRepeatTargetReasonKey(reasonCode: AvailabilityRepeatReasonCode) {
  switch (reasonCode) {
    case "TARGET_HAS_BOOKINGS":
    case "TARGET_CHANGED_SINCE_PREVIEW":
      return "conflict" as const;
    case "TARGET_PUBLISHED":
      return "protected" as const;
    case "TARGET_ALREADY_EXISTS":
      return "existing" as const;
    case "ELIGIBLE":
      return "eligible" as const;
    default:
      return "blocked" as const;
  }
}

export function getRepeatPreviewCounts(targets: AvailabilityRepeatTarget[]) {
  return targets.reduce(
    (result, target) => {
      if (target.classification === "ELIGIBLE") {
        result.eligibleWeeks += 1;
        result.copiedSlots += target.copiedSlotCount;
      } else {
        result.exceptions += 1;
      }
      return result;
    },
    { eligibleWeeks: 0, copiedSlots: 0, exceptions: 0 },
  );
}
