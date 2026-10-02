import { describe, expect, it } from "vitest";

import { normalizeWhatsAppNumber } from "./contact-utils";

describe("normalizeWhatsAppNumber", () => {
  it("normalizes a valid local number with the canonical country", () => {
    expect(normalizeWhatsAppNumber("010 1234 5678", "EG")).toBe("201012345678");
  });

  it("preserves international numbers without a plus sign", () => {
    expect(normalizeWhatsAppNumber("+1 (202) 555-0100")).toBe("12025550100");
  });

  it("returns null when the country/number is ambiguous or invalid", () => {
    expect(normalizeWhatsAppNumber("010 1234 5678")).toBeNull();
    expect(normalizeWhatsAppNumber("not-a-phone", "EG")).toBeNull();
  });
});
