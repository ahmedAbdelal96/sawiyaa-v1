import { describe, expect, it } from "vitest";
import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "./localized-specialty";

describe("backend-resolved specialty labels", () => {
  it("uses the locale-specific taxonomy fields for both locales", () => {
    const specialty = {
      id: "specialty-1",
      name: "Anxiety Therapy",
      nameAr: "Legacy Arabic",
      nameEn: "Legacy English",
      slug: "anxiety-therapy",
    } as const;
    const category = {
      id: "category-1",
      name: "Mental Health",
      nameAr: "Legacy Arabic category",
      nameEn: "Legacy English category",
      slug: "mental-health",
    } as const;

    expect(getLocalizedSpecialtyName(specialty, "ar")).toBe("Legacy Arabic");
    expect(getLocalizedSpecialtyName(specialty, "en")).toBe("Legacy English");
    expect(getLocalizedSpecialtyCategoryName(category, "ar")).toBe(
      "Legacy Arabic category",
    );
    expect(getLocalizedSpecialtyCategoryName(category, "en")).toBe(
      "Legacy English category",
    );
  });
});
