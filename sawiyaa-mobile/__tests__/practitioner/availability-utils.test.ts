import { AVAILABILITY_WEEK_MAX_SLOTS, countSelectedAvailabilitySlots, emptySelectedTimes, formatMinuteRange, formatMinuteRangeParts, getAvailabilityRangeFlexDirection, getDiscreteSlotsInRange, selectedTimesToSlots, slotsToSelectedTimes, timeOptions, type DayOfWeek } from "../../src/features/practitioner/availability/utils";

describe("practitioner availability grid", () => {
  it("accepts the mathematical weekly maximum and counts beyond it", () => {
    const selected = emptySelectedTimes();
    for (const duration of [30, 60] as const) for (let day = 0; day < 7; day += 1) selected[duration][day as DayOfWeek] = timeOptions(duration);
    expect(countSelectedAvailabilitySlots(selected)).toBe(AVAILABILITY_WEEK_MAX_SLOTS);
    selected[30][0].push(1);
    expect(countSelectedAvailabilitySlots(selected)).toBe(AVAILABILITY_WEEK_MAX_SLOTS);
    selected[30][0].push(30);
    expect(countSelectedAvailabilitySlots(selected)).toBe(AVAILABILITY_WEEK_MAX_SLOTS + 1);
  });
  it("uses 48 half-hour and 24 one-hour wall-time options", () => {
    expect(timeOptions(30)).toHaveLength(48);
    expect(timeOptions(30).at(-1)).toBe(1410);
    expect(timeOptions(60)).toHaveLength(24);
    expect(timeOptions(60).at(-1)).toBe(1380);
  });

  it("round-trips independent day and duration selections", () => {
    const selected = emptySelectedTimes();
    selected[30][1] = [540, 570];
    selected[60][5] = [900];
    const slots = selectedTimesToSlots(selected);
    const restored = slotsToSelectedTimes(slots.map((slot, index) => ({ ...slot, id: String(index) })));
    expect(restored.selected).toEqual(selected);
    expect(restored.invalidLegacy60Starts).toEqual([]);
    expect(slots.every((slot) => !Object.prototype.hasOwnProperty.call(slot, "timezone"))).toBe(true);
  });

  it("generates aligned discrete custom-range starts", () => {
    expect(getDiscreteSlotsInRange("09:00", "11:00", 30)).toEqual({ ok: true, slots: [540, 570, 600, 630] });
    expect(getDiscreteSlotsInRange("09:15", "11:00", 30)).toEqual({ ok: false, reason: "notAligned" });
    expect(getDiscreteSlotsInRange("11:00", "09:00", 30)).toEqual({ ok: false, reason: "endBeforeStart" });
  });

  it("generates unique 60-minute starts and rejects invalid boundaries", () => {
    const result = getDiscreteSlotsInRange("09:00", "13:00", 60);
    expect(result).toEqual({ ok: true, slots: [540, 600, 660, 720] });
    if (result.ok) expect(new Set(result.slots).size).toBe(result.slots.length);
    expect(getDiscreteSlotsInRange("24:00", "25:00", 60)).toEqual({ ok: false, reason: "invalidFormat" });
    expect(getDiscreteSlotsInRange("09:00", "09:00", 60)).toEqual({ ok: false, reason: "endBeforeStart" });
  });

  it("formats compact Arabic availability ranges", () => {
    const label = formatMinuteRange(0, 30, true);
    const visibleLabel = label.replace(/[\u2066\u2069]/g, "");

    expect(visibleLabel).toBe("12:00 ص – 12:30 ص");
    expect(visibleLabel).not.toContain("من");
    expect(visibleLabel).not.toContain("إلى");
  });

  it.each([
    [0, 30, "12:00 ص", "12:30 ص"],
    [720, 30, "12:00 م", "12:30 م"],
    [1410, 30, "11:30 م", "12:00 ص"],
    [690, 30, "11:30 ص", "12:00 م"],
  ])("keeps Arabic range parts in start/end order (%s)", (start, duration, expectedStart, expectedEnd) => {
    expect(formatMinuteRangeParts(start, duration, true)).toEqual({ start: expectedStart, end: expectedEnd });
  });

  it("formats compact English availability ranges", () => {
    const label = formatMinuteRange(0, 30, false);

    expect(label).toBe("12:00 AM – 12:30 AM");
    expect(label).not.toContain("From");
    expect(label).not.toContain("to");
  });

  it("keeps the English midnight range unchanged", () => {
    expect(formatMinuteRangeParts(1410, 30, false)).toEqual({ start: "11:30 PM", end: "12:00 AM" });
    expect(formatMinuteRange(1410, 30, false)).toBe("11:30 PM – 12:00 AM");
  });

  it("uses locale-specific outer layout without changing semantic parts", () => {
    expect(getAvailabilityRangeFlexDirection(true)).toBe("row-reverse");
    expect(getAvailabilityRangeFlexDirection(false)).toBe("row");
    const parts = formatMinuteRangeParts(60, 30, true);
    expect(parts.start).toContain("1:00");
    expect(parts.end).toContain("1:30");
    expect(parts.start).not.toBe(parts.end);
  });

  it("does not re-submit legacy 60-minute starts on 30-minute boundaries", () => {
    const restored = slotsToSelectedTimes([
      { dayOfWeek: 1, durationMinutes: 60, startMinuteOfDay: 630, endMinuteOfDay: 690 },
      { dayOfWeek: 1, durationMinutes: 60, startMinuteOfDay: 660, endMinuteOfDay: 720 },
    ]);

    expect(restored.invalidLegacy60Starts).toEqual([630]);
    expect(restored.invalidLegacy60Slots).toEqual([{ dayOfWeek: 1, startMinuteOfDay: 630, endMinuteOfDay: 690 }]);
    expect(restored.selected[60][1]).toEqual([660]);
    expect(selectedTimesToSlots(restored.selected)).toEqual([
      { dayOfWeek: 1, durationMinutes: 60, startMinuteOfDay: 660, endMinuteOfDay: 720 },
    ]);
  });
});
