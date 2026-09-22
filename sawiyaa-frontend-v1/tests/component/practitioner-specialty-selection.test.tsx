import { describe, expect, it } from "vitest";
import {
  filterSpecialtiesByPrimaryCategory,
  retainValidSpecialtyIds,
} from "@/features/practitioners/components/application/specialty-selection";

const specialties = [
  { id: "child-a", category: { id: "parent-a" } },
  { id: "child-b", category: { id: "parent-a" } },
  { id: "child-c", category: { id: "parent-b" } },
  { id: "uncategorized", category: null },
];

describe("practitioner specialty hierarchy", () => {
  it("returns no child options before a primary specialty is selected", () => {
    expect(filterSpecialtiesByPrimaryCategory(specialties, "")).toEqual([]);
  });

  it("uses the API-provided parent relationship to filter children", () => {
    expect(filterSpecialtiesByPrimaryCategory(specialties, "parent-a")).toEqual([
      specialties[0],
      specialties[1],
    ]);
  });

  it("returns an empty state when the selected primary has no children", () => {
    expect(filterSpecialtiesByPrimaryCategory(specialties, "parent-without-children")).toEqual([]);
  });

  it("clears children that do not belong to the new primary specialty", () => {
    expect(
      retainValidSpecialtyIds(["child-a", "child-c", "missing"], specialties, "parent-a"),
    ).toEqual(["child-a"]);
  });
});
