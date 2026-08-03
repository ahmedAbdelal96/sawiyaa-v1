import { describe, expect, it } from "vitest";
import { formatRuntimeViewerDateTime } from "./runtime-time";

describe("runtime viewer time", () => {
  it("formats persisted viewer time in the requested IANA timezone", () => {
    const value = "2026-08-02T12:00:00.000Z";
    const cairo = formatRuntimeViewerDateTime(value, "en-US", "Africa/Cairo");
    const newYork = formatRuntimeViewerDateTime(
      value,
      "en-US",
      "America/New_York",
    );

    expect(cairo).not.toBe(newYork);
    expect(cairo).toContain("3:00");
    expect(newYork).toContain("8:00");
  });
});
