import type {
  Specialty,
  SpecialtyCategory,
} from "@/features/specialties/types/specialties.types";

function readDisplayText(value: unknown, locale: string): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidates = locale.startsWith("ar")
    ? [record.ar, record.arabic, record.nameAr, record.en, record.english, record.nameEn, record.name]
    : [record.en, record.english, record.nameEn, record.ar, record.arabic, record.nameAr, record.name];

  return candidates.find(
    (candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0,
  )?.trim() ?? null;
}

function resolveLocalizedName(
  values: unknown[],
  locale: string,
  fallback: string,
): string {
  for (const value of values) {
    const text = readDisplayText(value, locale);
    if (text) return text;
  }

  return fallback;
}

export function getLocalizedSpecialtyCategoryName(
  category: Pick<SpecialtyCategory, "name" | "nameAr" | "nameEn" | "slug">,
  locale: string,
) {
  return resolveLocalizedName(
    locale.startsWith("ar")
      ? [category.nameAr, category.nameEn, category.name]
      : [category.nameEn, category.nameAr, category.name],
    locale,
    category.slug,
  );
}

export function getLocalizedSpecialtyName(
  specialty: Pick<Specialty, "name" | "nameAr" | "nameEn" | "slug">,
  locale: string,
) {
  return resolveLocalizedName(
    locale.startsWith("ar")
      ? [specialty.nameAr, specialty.nameEn, specialty.name]
      : [specialty.nameEn, specialty.nameAr, specialty.name],
    locale,
    specialty.slug,
  );
}
