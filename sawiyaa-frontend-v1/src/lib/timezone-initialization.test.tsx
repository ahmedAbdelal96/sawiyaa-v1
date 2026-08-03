import { describe, expect, it } from "vitest";
import {
  detectBrowserIanaTimeZone,
  isMissingPersistedTimeZone,
} from "./timezone-initialization";

describe("automatic timezone initialization", () => {
  it("only treats null and empty values as eligible", () => {
    expect(isMissingPersistedTimeZone(null)).toBe(true);
    expect(isMissingPersistedTimeZone("   ")).toBe(true);
    expect(isMissingPersistedTimeZone("Africa/Cairo")).toBe(false);
    expect(isMissingPersistedTimeZone("Invalid/Timezone")).toBe(false);
  });

  it("detects a named browser IANA timezone", () => {
    expect(detectBrowserIanaTimeZone()).toBeTruthy();
    expect(detectBrowserIanaTimeZone()).not.toMatch(/^[+-]|^UTC[+-]|^GMT[+-]/i);
  });
});
