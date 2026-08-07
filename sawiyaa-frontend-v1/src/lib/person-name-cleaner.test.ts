import { describe, expect, it } from "vitest";
import {
  cleanPersonName,
  formatPersonDisplayName,
  formatSessionTimeRange,
} from "./person-name-cleaner";

describe("person-name-cleaner utility", () => {
  it("cleanPersonName strips raw trailing UUIDs and slug prefixes", () => {
    expect(
      cleanPersonName("Patient Scenario G 0ee8710e-113a-43c8-83cc-98f74a15ac55")
    ).toBe("Patient Scenario G");

    expect(
      cleanPersonName("Practitioner Scenario A aec63899-edd4-4186-b34a-c2eb22ef5168")
    ).toBe("Practitioner Scenario A");

    expect(cleanPersonName("د. سفيان السيد")).toBe("د. سفيان السيد");
    expect(cleanPersonName("أحمد علي")).toBe("أحمد علي");
  });

  it("formatPersonDisplayName falls back cleanly when display name is missing or raw UUID", () => {
    expect(
      formatPersonDisplayName(
        "Patient Scenario G 0ee8710e-113a-43c8-83cc-98f74a15ac55",
        "pat-123",
        "المريض"
      )
    ).toBe("Patient Scenario G");

    expect(
      formatPersonDisplayName(
        "pat-scen-g-0ee8710e-113a-43c8-83cc-98f74a15ac55",
        null,
        "المريض"
      )
    ).toBe("المريض");
  });

  it("formatSessionTimeRange formats session date and time range clearly", () => {
    const formattedAr = formatSessionTimeRange(
      "ar",
      "2026-08-05T16:00:00.000Z",
      "2026-08-05T16:30:00.000Z"
    );
    expect(formattedAr).toContain("4:00");
    expect(formattedAr).toContain("4:30");

    const formattedEn = formatSessionTimeRange(
      "en",
      "2026-08-05T16:00:00.000Z",
      "2026-08-05T16:30:00.000Z"
    );
    expect(formattedEn).toContain("4:00");
    expect(formattedEn).toContain("4:30");
  });
});
