import type { Specialty, SpecialtyCategory } from "../../specialties/contracts";
import type { ListPublicPractitionersFilters } from "./types";

export type DiscoveryRouteParams = Record<string, string>;

const FILTER_KEYS = [
  "specialtySlug",
  "specialtyCategorySlug",
  "country",
  "practitionerKind",
  "gender",
  "duration",
  "onlineNow",
  "availableToday",
  "availableThisWeek",
  "acceptsCoupon",
  "acceptsPackage",
  "minRating",
  "minSessionFee",
  "maxSessionFee",
  "sort",
] as const;

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDuration(value: string | undefined): 30 | 60 | undefined {
  if (value === "30" || value === "60") return Number(value) as 30 | 60;
  return undefined;
}

function parseSort(value: string | undefined): ListPublicPractitionersFilters["sort"] {
  if (value === "recommended" || value === "rating" || value === "experience") {
    return value;
  }
  return undefined;
}

function parsePractitionerKind(
  value: string | undefined,
): ListPublicPractitionersFilters["practitionerKind"] {
  if (value === "doctor" || value === "therapist") return value;
  return undefined;
}

export function toDiscoveryFilters(
  params: DiscoveryRouteParams,
  pageSize: number,
): Omit<ListPublicPractitionersFilters, "page"> {
  return {
    search: params.search || undefined,
    specialtySlug: params.specialtySlug || params.specialties || undefined,
    specialtyCategorySlug: params.specialtyCategorySlug || params.categorySlug || undefined,
    language: params.language || undefined,
    languageCodes: (params.languageCodes || "").split(",").filter(Boolean),
    country: params.country || undefined,
    practitionerKind: parsePractitionerKind(params.practitionerKind),
    gender: params.gender === "male" || params.gender === "female" ? params.gender : undefined,
    duration: parseDuration(params.duration),
    onlineNow: parseBoolean(params.onlineNow),
    availableToday: parseBoolean(params.availableToday),
    availableThisWeek: parseBoolean(params.availableThisWeek),
    acceptsCoupon: parseBoolean(params.acceptsCoupon),
    acceptsPackage: parseBoolean(params.acceptsPackage),
    minRating: parseNumber(params.minRating),
    minSessionFee: parseNumber(params.minSessionFee),
    maxSessionFee: parseNumber(params.maxSessionFee),
    sort: parseSort(params.sort),
    limit: pageSize,
  };
}

export function getActiveDiscoveryFilterCount(params: DiscoveryRouteParams): number {
  const languageFilterActive = Boolean(params.languageCodes || params.language);
  return FILTER_KEYS.filter((key) => params[key] !== undefined && params[key] !== "").length + (languageFilterActive ? 1 : 0);
}

export function getVisibleSpecialtyCategories(
  categories: SpecialtyCategory[],
  limit = 6,
): SpecialtyCategory[] {
  return categories
    .filter((category) => category.isActive !== false)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .slice(0, limit);
}

export function getSpecialtiesForCategory(
  specialties: Specialty[],
  categoryId: string | undefined,
): Specialty[] {
  return specialties
    .filter((specialty) => specialty.isActive !== false)
    .filter((specialty) => !categoryId || specialty.category?.id === categoryId)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
