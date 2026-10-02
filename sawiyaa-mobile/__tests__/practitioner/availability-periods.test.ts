import { groupAvailabilityPeriods } from "../../src/features/practitioner/availability/availability-periods";

describe("practitioner availability period presentation", () => {
  it("groups consecutive editable slots into one range", () => {
    expect(groupAvailabilityPeriods([
      { startMinuteOfDay: 540, durationMinutes: 30, state: "editable" },
      { startMinuteOfDay: 570, durationMinutes: 30, state: "editable" },
      { startMinuteOfDay: 600, durationMinutes: 30, state: "editable" },
    ])).toEqual([{
      id: "editable:30:540",
      startMinuteOfDay: 540,
      endMinuteOfDay: 630,
      durationMinutes: 30,
      state: "editable",
      slotStarts: [540, 570, 600],
    }]);
  });

  it("splits a gap instead of implying continuous availability", () => {
    const periods = groupAvailabilityPeriods([
      { startMinuteOfDay: 540, durationMinutes: 30, state: "editable" },
      { startMinuteOfDay: 600, durationMinutes: 30, state: "editable" },
    ]);

    expect(periods.map((period) => [period.startMinuteOfDay, period.endMinuteOfDay])).toEqual([[540, 570], [600, 630]]);
  });

  it("splits duration changes and protected boundaries", () => {
    const periods = groupAvailabilityPeriods([
      { startMinuteOfDay: 540, durationMinutes: 30, state: "editable" },
      { startMinuteOfDay: 570, durationMinutes: 30, state: "booked" },
      { startMinuteOfDay: 600, durationMinutes: 30, state: "editable" },
      { startMinuteOfDay: 630, durationMinutes: 30, state: "protected" },
      { startMinuteOfDay: 660, durationMinutes: 60, state: "editable" },
    ]);

    expect(periods.map((period) => ({ start: period.startMinuteOfDay, end: period.endMinuteOfDay, duration: period.durationMinutes, state: period.state }))).toEqual([
      { start: 540, end: 570, duration: 30, state: "editable" },
      { start: 570, end: 600, duration: 30, state: "booked" },
      { start: 600, end: 630, duration: 30, state: "editable" },
      { start: 630, end: 660, duration: 30, state: "protected" },
      { start: 660, end: 720, duration: 60, state: "editable" },
    ]);
  });

  it("keeps 30- and 60-minute periods as separate presentations", () => {
    const periods = groupAvailabilityPeriods([
      { startMinuteOfDay: 540, durationMinutes: 60, state: "editable" },
      { startMinuteOfDay: 600, durationMinutes: 60, state: "editable" },
      { startMinuteOfDay: 720, durationMinutes: 30, state: "editable" },
      { startMinuteOfDay: 750, durationMinutes: 30, state: "editable" },
    ]);

    expect(periods).toHaveLength(2);
    expect(periods[0].slotStarts).toEqual([540, 600]);
    expect(periods[1].slotStarts).toEqual([720, 750]);
  });
});
