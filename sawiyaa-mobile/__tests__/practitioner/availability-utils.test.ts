import { emptySelectedTimes, selectedTimesToSlots, slotsToSelectedTimes, timeOptions } from "../../src/features/practitioner/availability/utils";

describe("practitioner availability grid", () => {
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
    expect(restored).toEqual(selected);
    expect(slots.every((slot) => !Object.prototype.hasOwnProperty.call(slot, "timezone"))).toBe(true);
  });
});
