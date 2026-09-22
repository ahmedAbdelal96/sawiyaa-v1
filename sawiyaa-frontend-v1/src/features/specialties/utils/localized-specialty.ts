import type {
  Specialty,
  SpecialtyCategory,
} from "@/features/specialties/types/specialties.types";

export function getLocalizedSpecialtyCategoryName(
  category: Pick<SpecialtyCategory, "name" | "nameAr" | "nameEn" | "slug">,
  locale: string,
) {
  const preferred = locale === "ar" ? category.nameAr : category.nameEn;
  return preferred?.trim() || category.name?.trim() || category.nameAr?.trim() || category.nameEn?.trim() || category.slug;
}

export function getLocalizedSpecialtyName(
  specialty: Pick<Specialty, "name" | "nameAr" | "nameEn" | "slug">,
  locale: string,
) {
  const preferred = locale === "ar" ? specialty.nameAr : specialty.nameEn;
  return preferred?.trim() || specialty.name?.trim() || specialty.nameAr?.trim() || specialty.nameEn?.trim() || specialty.slug;
}
