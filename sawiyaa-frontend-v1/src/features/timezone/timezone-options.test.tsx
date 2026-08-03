import { describe, expect, it } from "vitest";
import {
  buildTimeZoneOptions,
  createTimeZoneOption,
  getTimeZoneSnapshot,
} from "./timezone-options";

describe("timezone options", () => {
  it("uses valid IANA identifiers and preserves a persisted selection", () => {
    const options = buildTimeZoneOptions({
      locale: "en",
      selectedTimeZone: "Africa/Casablanca",
    });
    expect(options[0]?.value).toBe("Africa/Casablanca");
    expect(options.some((option) => option.value === "America/New_York")).toBe(
      true,
    );
  });

  it("searches IDs, regions, cities, and aliases without duplicates", () => {
    const options = buildTimeZoneOptions({ locale: "ar", query: "riyadh" });
    expect(options.map((option) => option.value)).toEqual(["Asia/Riyadh"]);
    expect(new Set(options.map((option) => option.value)).size).toBe(
      options.length,
    );
  });

  it("rejects non-IANA values and formats one display-only snapshot", () => {
    expect(createTimeZoneOption("UTC+02:00", "en")).toBeNull();
    expect(getTimeZoneSnapshot("Africa/Cairo", "en")).toEqual(
      expect.any(String),
    );
  });
});
