import type { Specialty, SpecialtyCategory } from "./contracts";

export function getLocalizedSpecialtyName(
  specialty: Pick<Specialty, "name" | "nameAr" | "nameEn" | "slug">,
  _locale: string,
) {
  return specialty.name?.trim() || specialty.slug;
}

export function getLocalizedSpecialtyCategoryName(
  category: Pick<SpecialtyCategory, "name" | "nameAr" | "nameEn" | "slug">,
  _locale: string,
) {
  return category.name?.trim() || category.slug;
}
