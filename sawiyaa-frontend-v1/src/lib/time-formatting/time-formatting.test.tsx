import { describe, expect, it } from "vitest";
import {
  formatCalendarDate,
  formatEffectiveViewerDateTime,
  formatViewerDateTime,
  formatMinuteOfDay,
  normalizeIanaTimeZone,
  resolveEffectiveViewerTimeZone,
} from "./time-formatting";
import { formatPractitionerOrViewerDateTime } from "./practitioner-time-formatting";

describe("canonical Web time formatting", () => {
  const instant = "2026-08-10T21:30:00.000Z";

  it("prefers a valid profile timezone, then browser timezone, then UTC", () => {
    expect(
      resolveEffectiveViewerTimeZone("Asia/Riyadh", "America/New_York"),
    ).toBe("Asia/Riyadh");
    expect(resolveEffectiveViewerTimeZone("not/a-zone", "Asia/Riyadh")).toBe(
      "Asia/Riyadh",
    );
    expect(resolveEffectiveViewerTimeZone("not/a-zone", "UTC")).toBe("UTC");
  });

  it("rejects fixed offsets and invalid IANA values without throwing", () => {
    expect(normalizeIanaTimeZone("UTC+02:00")).toBeNull();
    expect(normalizeIanaTimeZone("not/a-zone")).toBeNull();
    expect(() =>
      formatEffectiveViewerDateTime("not-a-timestamp", "not/a-zone"),
    ).not.toThrow();
  });

  it("formats the same instant in the requested viewer timezone", () => {
    const cairo = formatEffectiveViewerDateTime(instant, "Africa/Cairo", {
      locale: "en-US",
    });
    const newYork = formatEffectiveViewerDateTime(instant, "America/New_York", {
      locale: "en-US",
    });
    const expectedCairo = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(instant));

    expect(cairo).toBe(expectedCairo);
    expect(newYork).not.toBe(cairo);
  });

  it("keeps date-only values on their calendar date", () => {
    expect(formatCalendarDate("2026-08-10", { locale: "en-US" })).toContain(
      "Aug 10, 2026",
    );
    expect(
      formatCalendarDate("2026-02-30", {
        locale: "en-US",
        fallbackText: "invalid",
      }),
    ).toBe("invalid");
    expect(
      formatCalendarDate("invalid", { locale: "en-US", fallbackText: "—" }),
    ).toBe("—");
  });

  it("uses UTC deterministically during server rendering when no timezone exists", () => {
    const value = formatEffectiveViewerDateTime(instant, "UTC", {
      locale: "en-US",
    });
    const expected = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(instant));

    expect(value).toBe(expected);
  });

  it("keeps Practitioner UTC instants on the persisted practitioner timezone", () => {
    const value = formatPractitionerOrViewerDateTime(instant, "Asia/Riyadh", {
      locale: "en-US",
    });
    const expected = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
    }).format(new Date(instant));

    expect(value).toBe(expected);
  });

  it("keeps Arabic and English on the same instant and timezone", () => {
    const english = formatEffectiveViewerDateTime(instant, "Asia/Riyadh", {
      locale: "en-US",
    });
    const arabic = formatEffectiveViewerDateTime(instant, "Asia/Riyadh", {
      locale: "ar-EG",
    });
    const expectedArabic = new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
    }).format(new Date(instant));

    expect(arabic).toBe(expectedArabic);
    expect(arabic).not.toBe(english);
  });

  it("preserves availability editor wall-clock minutes without viewer conversion", () => {
    expect(formatMinuteOfDay(90, { locale: "en-US" })).toBe("01:30");
    expect(formatMinuteOfDay(90, { locale: "ar-EG" })).toBe("٠١:٣٠");
  });
});
