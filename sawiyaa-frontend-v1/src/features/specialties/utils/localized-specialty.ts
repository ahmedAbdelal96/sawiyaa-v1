import type {
  Specialty,
  SpecialtyCategory,
} from "@/features/specialties/types/specialties.types";

export function getLocalizedSpecialtyCategoryName(
  category: Pick<SpecialtyCategory, "name" | "nameAr" | "nameEn" | "slug">,
  locale: string,
) {
  return locale.startsWith("ar")
    ? category.nameAr ?? category.nameEn ?? category.name ?? category.slug
    : category.nameEn ?? category.nameAr ?? category.name ?? category.slug;
}

export function getLocalizedSpecialtyName(
  specialty: Pick<Specialty, "name" | "nameAr" | "nameEn" | "slug">,
  locale: string,
) {
  return locale.startsWith("ar")
    ? specialty.nameAr ?? specialty.nameEn ?? specialty.name ?? specialty.slug
    : specialty.nameEn ?? specialty.nameAr ?? specialty.name ?? specialty.slug;
}
