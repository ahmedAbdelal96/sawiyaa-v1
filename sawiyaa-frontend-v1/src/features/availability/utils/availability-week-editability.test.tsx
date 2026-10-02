import { describe, expect, it } from "vitest";
import { canEditAvailabilitySlot, canEditAvailabilityWeek, isAvailabilityStartInPast } from "./availability-week-editability";

describe("current-week schedule editability", () => {
  it("keeps a published week editable when all existing slots are protected", () => {
    expect(canEditAvailabilityWeek({ status: "PUBLISHED", canCreate: false })).toBe(true);
    expect(canEditAvailabilityWeek({ status: "DRAFT", canCreate: false })).toBe(true);
  });

  it("does not open archived or unavailable weeks", () => {
    expect(canEditAvailabilityWeek({ status: "ARCHIVED", canCreate: false })).toBe(false);
    expect(canEditAvailabilityWeek({ status: "ARCHIVED", canCreate: true })).toBe(false);
    expect(canEditAvailabilityWeek({ status: "NOT_SET", canCreate: false })).toBe(false);
  });

  it("blocks new published slots in the past using the week timezone", () => {
    const now = new Date("2026-08-11T10:30:00Z");
    expect(isAvailabilityStartInPast("2026-08-09", "UTC", 2, 630, now)).toBe(true);
    expect(isAvailabilityStartInPast("2026-08-09", "UTC", 2, 660, now)).toBe(false);
    expect(isAvailabilityStartInPast("2026-08-09", "UTC", 3, 0, now)).toBe(false);
  });

  it("keeps unrelated future slots editable while protecting booked or past slots", () => {
    expect(canEditAvailabilitySlot({})).toBe(true);
    expect(canEditAvailabilitySlot({ canEdit: false, isBookedOrReserved: true })).toBe(false);
    expect(canEditAvailabilitySlot({ canRemove: false })).toBe(false);
    expect(canEditAvailabilitySlot({ isPast: true })).toBe(false);
  });
});
