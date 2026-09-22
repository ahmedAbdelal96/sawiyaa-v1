import {
  getActiveDiscoveryFilterCount,
  getSpecialtiesForCategory,
  getVisibleSpecialtyCategories,
  toDiscoveryFilters,
} from "../src/features/patient/discovery/view-model";

describe("patient discovery view model", () => {
  it("maps category selection to the backend-supported category filter", () => {
    expect(
      toDiscoveryFilters(
        {
          search: "anxiety",
          specialtyCategorySlug: "mental-health",
          languageCodes: "ar,en",
          duration: "30",
        },
        12,
      ),
    ).toMatchObject({
      search: "anxiety",
      specialtyCategorySlug: "mental-health",
      languageCodes: ["ar", "en"],
      duration: 30,
      limit: 12,
    });
  });

  it("counts filters without counting the search query", () => {
    expect(getActiveDiscoveryFilterCount({ search: "Mona" })).toBe(0);
    expect(
      getActiveDiscoveryFilterCount({ search: "Mona", specialtyCategorySlug: "family", duration: "60" }),
    ).toBe(2);
    expect(getActiveDiscoveryFilterCount({ language: "en", languageCodes: "en" })).toBe(1);
  });

  it("uses backend ordering and preserves the category hierarchy", () => {
    const categories = [
      { id: "2", slug: "second", sortOrder: 2, isActive: true },
      { id: "1", slug: "first", sortOrder: 1, isActive: true },
      { id: "3", slug: "hidden", sortOrder: 0, isActive: false },
    ] as never[];
    expect(getVisibleSpecialtyCategories(categories as any).map((item) => item.slug)).toEqual(["first", "second"]);

    const specialties = [
      { id: "a", slug: "a", sortOrder: 2, isActive: true, category: { id: "1" } },
      { id: "b", slug: "b", sortOrder: 1, isActive: true, category: { id: "1" } },
      { id: "c", slug: "c", sortOrder: 0, isActive: true, category: { id: "2" } },
    ] as never[];
    expect(getSpecialtiesForCategory(specialties as any, "1").map((item) => item.slug)).toEqual(["b", "a"]);
  });
});
