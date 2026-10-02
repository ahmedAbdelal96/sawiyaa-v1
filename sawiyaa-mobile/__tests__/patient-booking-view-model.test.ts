import {
  findNearestAvailableDayKey,
  getSupportedBookingDurations,
  normalizeBookingDuration,
} from "../src/features/patient/booking/view-model";

describe("patient booking view model", () => {
  it("shows only durations with a published price", () => {
    expect(
      getSupportedBookingDurations({
        sessionPrice30: 350,
        sessionPrice60: null,
        displaySessionPrice30: null,
        displaySessionPrice60: null,
        currencyCode: "EGP",
      } as never),
    ).toEqual([{ durationMinutes: 30, amount: 350, currencyCode: "EGP" }]);
  });

  it("preserves the supported 60 minute duration from route context", () => {
    expect(normalizeBookingDuration("60")).toBe(60);
    expect(normalizeBookingDuration("30")).toBe(30);
  });

  it("starts appointment selection on the nearest day with slots", () => {
    expect(
      findNearestAvailableDayKey([
        { dayKey: "2026-08-16", slots: [] },
        { dayKey: "2026-08-17", slots: [{ startsAt: "10:00" }] },
      ]),
    ).toBe("2026-08-17");
  });
});
