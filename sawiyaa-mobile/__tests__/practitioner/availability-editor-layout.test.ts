import { getAvailabilityEditorGridLayout } from "../../src/features/practitioner/availability/editor-layout";

describe("getAvailabilityEditorGridLayout", () => {
  it("uses two readable columns at compact widths", () => {
    const layout = getAvailabilityEditorGridLayout(360, 292);

    expect(layout.columns).toBe(2);
    expect(layout.slotWidth).toBeGreaterThanOrEqual(96);
  });

  it("uses three columns only when the wider layout can fit them", () => {
    const layout = getAvailabilityEditorGridLayout(430, 362);

    expect(layout.columns).toBe(3);
    expect(layout.slotWidth).toBeGreaterThanOrEqual(96);
  });

  it("falls back to two columns when measured space is too narrow", () => {
    expect(getAvailabilityEditorGridLayout(430, 320).columns).toBe(2);
  });
});
