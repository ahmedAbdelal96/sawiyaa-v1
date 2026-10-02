import {
  getRepeatPreviewCounts,
  getRepeatTargetReasonKey,
  getRepeatTargetWindowState,
} from "../../src/features/practitioner/availability/repeat-view-model";

describe("availability repeat view model", () => {
  it("keeps an uncreated future week selectable", () => {
    expect(getRepeatTargetWindowState({ canCreate: true, containsBookings: false, status: "NOT_SET", weekId: null })).toBe("eligible");
  });

  it("presents booked existing weeks as conflicts and other existing weeks as blocked", () => {
    expect(getRepeatTargetWindowState({ canCreate: false, containsBookings: true, status: "DRAFT", weekId: "week-1" })).toBe("conflict");
    expect(getRepeatTargetWindowState({ canCreate: false, containsBookings: false, status: "PUBLISHED", weekId: "week-2" })).toBe("blocked");
  });

  it("maps server repeat classifications to human presentation keys", () => {
    expect(getRepeatTargetReasonKey("TARGET_HAS_BOOKINGS")).toBe("conflict");
    expect(getRepeatTargetReasonKey("TARGET_PUBLISHED")).toBe("protected");
    expect(getRepeatTargetReasonKey("TARGET_ALREADY_EXISTS")).toBe("existing");
    expect(getRepeatTargetReasonKey("ELIGIBLE")).toBe("eligible");
  });

  it("summarizes eligible weeks and meaningful exceptions", () => {
    expect(getRepeatPreviewCounts([
      { weekStartDate: "2026-08-23", reasonCode: "ELIGIBLE", classification: "ELIGIBLE", copiedSlotCount: 8 },
      { weekStartDate: "2026-08-30", reasonCode: "TARGET_HAS_BOOKINGS", classification: "SKIPPED", copiedSlotCount: 0 },
      { weekStartDate: "2026-09-06", reasonCode: "TARGET_PUBLISHED", classification: "SKIPPED", copiedSlotCount: 0 },
    ])).toEqual({ eligibleWeeks: 1, copiedSlots: 8, exceptions: 2 });
  });
});
