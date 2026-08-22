import {
  filterScheduleSlots,
  getDefaultScheduleDay,
  formatScheduleTimeZoneLabel,
  getSelectedWeekSlots,
  getScheduleSlotStatus,
  getWeekDays,
  summarizeScheduleSlots,
} from "../../src/features/practitioner/availability/schedule-view-model";
import type { AvailabilityWeekSlot } from "../../src/features/practitioner/availability/types";

const slot = (overrides: Partial<AvailabilityWeekSlot>): AvailabilityWeekSlot => ({
  id: "slot",
  dayOfWeek: 2,
  startMinuteOfDay: 540,
  endMinuteOfDay: 570,
  durationMinutes: 30,
  timezone: "Africa/Cairo",
  ...overrides,
});

describe("practitioner schedule day view", () => {
  it("defaults the current week to today and other weeks to Sunday", () => {
    expect(getDefaultScheduleDay(true, 4)).toBe(4);
    expect(getDefaultScheduleDay(false, 4)).toBe(0);
  });

  it("builds seven localized days from the backend week start", () => {
    const days = getWeekDays("2026-08-09", "en-US", "2026-08-11");

    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ dayOfWeek: 0, date: "2026-08-09", isToday: false });
    expect(days[2]).toMatchObject({ dayOfWeek: 2, date: "2026-08-11", isToday: true });
  });

  it("filters the selected day and duration without changing the source slots", () => {
    const slots = [
      slot({ id: "30", dayOfWeek: 2, durationMinutes: 30 }),
      slot({ id: "60", dayOfWeek: 2, durationMinutes: 60, endMinuteOfDay: 600 }),
      slot({ id: "other-day", dayOfWeek: 3 }),
    ];

    expect(filterScheduleSlots(slots, 2, "all").map((item) => item.id)).toEqual(["30", "60"]);
    expect(filterScheduleSlots(slots, 2, 60).map((item) => item.id)).toEqual(["60"]);
    expect(slots).toHaveLength(3);
  });

  it("returns no slots while the selected week details are unavailable", () => {
    expect(getSelectedWeekSlots(undefined, undefined)).toEqual([]);
    expect(getSelectedWeekSlots(undefined, "2026-08-09")).toEqual([]);
    expect(getSelectedWeekSlots({ weekStartDate: "2026-08-10", slots: [] }, "2026-08-09")).toEqual([]);
  });

  it("maps explicit booked and protected contract state to human statuses", () => {
    expect(getScheduleSlotStatus(slot({ isBookedOrReserved: true }))).toBe("booked");
    expect(getScheduleSlotStatus(slot({ canEdit: false, reasonCode: "ARCHIVED" }))).toBe("notEditable");
    expect(getScheduleSlotStatus(slot({}))).toBe("available");
  });

  it("summarizes only the visible filtered slot set", () => {
    const summary = summarizeScheduleSlots([
      slot({ id: "available" }),
      slot({ id: "booked", isBookedOrReserved: true }),
      slot({ id: "protected", canRemove: false, reasonCode: "ARCHIVED" }),
    ]);

    expect(summary).toEqual({ available: 1, booked: 1, notEditable: 1 });
  });

  it("keeps the main Schedule timezone label human and offset-free", () => {
    expect(formatScheduleTimeZoneLabel("Asia/Riyadh", "ar", new Date("2026-08-15T00:00:00Z"))).toBe("الرياض");
    expect(formatScheduleTimeZoneLabel("Asia/Riyadh", "en", new Date("2026-08-15T00:00:00Z"))).toBe("Riyadh");
  });
});
