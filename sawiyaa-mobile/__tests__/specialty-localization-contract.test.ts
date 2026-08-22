import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "../src/features/specialties/localized";

describe("specialty localization contract", () => {
  it("renders the backend-resolved name instead of selecting compatibility fields locally", () => {
    const specialty = {
      id: "specialty-1",
      name: "علاج القلق",
      nameAr: "Legacy Arabic",
      nameEn: "Legacy English",
      slug: "anxiety-therapy",
    } as const;
    const category = {
      id: "category-1",
      name: "الصحة النفسية",
      nameAr: "Legacy Arabic category",
      nameEn: "Legacy English category",
      slug: "mental-health",
    } as const;

    expect(getLocalizedSpecialtyName(specialty, "ar")).toBe("علاج القلق");
    expect(getLocalizedSpecialtyName(specialty, "en")).toBe("علاج القلق");
    expect(getLocalizedSpecialtyCategoryName(category, "ar")).toBe(
      "الصحة النفسية",
    );
    expect(getLocalizedSpecialtyCategoryName(category, "en")).toBe(
      "الصحة النفسية",
    );
  });
});
