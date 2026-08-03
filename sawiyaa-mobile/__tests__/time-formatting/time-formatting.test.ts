import {
  formatCalendarDate,
  resolveEffectiveViewerTimeZone,
  formatViewerDateTime,
  getEffectiveViewerTimeZone,
  isMissingPersistedTimeZone,
  setMobileTimeZoneContext,
} from "../../src/lib/time-formatting";

describe("canonical mobile time formatting", () => {
  const instant = "2026-08-10T21:30:00.000Z";

  afterEach(() => {
    setMobileTimeZoneContext({ profileTimeZone: null });
  });

  it("uses profile timezone before device timezone and UTC", () => {
    expect(
      resolveEffectiveViewerTimeZone("Asia/Riyadh", "America/New_York"),
    ).toBe("Asia/Riyadh");
    expect(
      resolveEffectiveViewerTimeZone("invalid/zone", "America/New_York"),
    ).toBe("America/New_York");
    expect(resolveEffectiveViewerTimeZone("invalid/zone", "invalid/zone")).toBe(
      "UTC",
    );
  });

  it("applies the authenticated profile timezone to shared viewer formatters", () => {
    setMobileTimeZoneContext({
      profileTimeZone: "Asia/Riyadh",
      deviceTimeZone: "America/New_York",
    });

    const value = formatViewerDateTime(instant, { locale: "en-US" });
    const expected = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
    }).format(new Date(instant));

    expect(getEffectiveViewerTimeZone()).toBe("Asia/Riyadh");
    expect(value).toBe(expected);
  });

  it("falls back safely and keeps date-only values on their calendar date", () => {
    setMobileTimeZoneContext({
      profileTimeZone: "invalid/zone",
      deviceTimeZone: "America/New_York",
    });

    expect(getEffectiveViewerTimeZone()).toBe("America/New_York");
    expect(formatCalendarDate("2026-08-10", { locale: "en-US" })).toContain(
      "Aug 10, 2026",
    );
    expect(
      formatCalendarDate("2026-02-30", {
        locale: "en-US",
        fallbackText: "invalid",
      }),
    ).toBe("invalid");
  });

  it("keeps Arabic and English on the same instant and timezone", () => {
    setMobileTimeZoneContext({ profileTimeZone: "Africa/Cairo" });
    const english = formatViewerDateTime(instant, { locale: "en-US" });
    const arabic = formatViewerDateTime(instant, { locale: "ar-EG" });

    expect(english).not.toBe(arabic);
    expect(arabic).toBe(
      new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Cairo",
      }).format(new Date(instant)),
    );
  });

  it("only initializes a missing profile timezone", () => {
    expect(isMissingPersistedTimeZone(null)).toBe(true);
    expect(isMissingPersistedTimeZone(" ")).toBe(true);
    expect(isMissingPersistedTimeZone("Africa/Cairo")).toBe(false);
    expect(isMissingPersistedTimeZone("Invalid/Timezone")).toBe(false);
  });
});
