import {
  buildTimeZoneOptions,
  createTimeZoneOption,
  getTimeZoneSnapshot,
} from "../src/features/timezone/timezone-options";

describe("timezone options", () => {
  it("preserves persisted values and exposes the full supported list", () => {
    const options = buildTimeZoneOptions({
      locale: "en",
      selectedTimeZone: "Africa/Casablanca",
    });
    expect(options[0]?.value).toBe("Africa/Casablanca");
    expect(options.some((option) => option.value === "America/New_York")).toBe(
      true,
    );
  });

  it("searches aliases and rejects fixed offsets", () => {
    expect(
      buildTimeZoneOptions({ locale: "ar", query: "riyadh" }).map(
        (option) => option.value,
      ),
    ).toEqual(["Asia/Riyadh"]);
    expect(createTimeZoneOption("UTC+02:00", "en")).toBeNull();
    expect(getTimeZoneSnapshot("Africa/Cairo", "ar")).toEqual(
      expect.any(String),
    );
  });
});
