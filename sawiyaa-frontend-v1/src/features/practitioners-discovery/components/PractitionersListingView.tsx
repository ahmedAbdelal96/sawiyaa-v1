import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, X, RotateCcw } from "lucide-react";
import ListingPageHero from "./ListingPageHero";
import FilterControls from "./FilterControls";
import PractitionerGrid from "./PractitionerGrid";
import ListingErrorState from "./ListingErrorState";
import {
  fetchPublicPractitionerFilters,
  fetchPublicPractitioners,
} from "../api/practitioners-ssr.api";
import { getLocalizedSpecialtyName } from "@/features/specialties/utils/localized-specialty";
import type { ActiveFeeFilterContext } from "../types/practitioner";

const VALID_SORT_VALUES = ["recommended", "experience", "rating"] as const;
const VALID_LIMIT_VALUES = [6, 12, 24] as const;
type SortValue = (typeof VALID_SORT_VALUES)[number];
type LimitValue = (typeof VALID_LIMIT_VALUES)[number];

export type PractitionersListingSearchParams = {
  search?: string;
  specialtyCategorySlug?: string;
  specialtySlug?: string;
  language?: string;
  languageCodes?: string | string[];
  country?: string;
  practitionerKind?: string;
  gender?: string;
  duration?: string;
  onlineNow?: string;
  instantBookingEnabled?: string;
  availableToday?: string;
  availableThisWeek?: string;
  acceptsCoupon?: string;
  acceptsPackage?: string;
  minRating?: string;
  minSessionFee?: string;
  maxSessionFee?: string;
  sort?: string;
  page?: string;
  limit?: string;
};

export type PractitionersListingViewData = {
  filters: Awaited<ReturnType<typeof fetchPublicPractitionerFilters>>;
  specialtyLabels: Record<string, string>;
  languageLabels: Record<string, string>;
  countryLabels: Record<string, string>;
  items: Awaited<ReturnType<typeof fetchPublicPractitioners>>["items"];
  pagination: Awaited<ReturnType<typeof fetchPublicPractitioners>>["pagination"];
  fetchError: boolean;
  currentPage: number;
  safeSearch: string;
  safeSpecialtyCategorySlug: string;
  safeSpecialtySlug: string;
  safeLanguageCodes: string[];
  safeCountry: string;
  safePractitionerKind: "doctor" | "therapist" | "";
  safeGender: "male" | "female" | "";
  safeDuration: 30 | 60 | undefined;
  safeOnlineNow: boolean;
  safeInstantBookingEnabled: boolean;
  safeMinRating: number | undefined;
  safeMinSessionFee: number | undefined;
  safeMaxSessionFee: number | undefined;
  safeSort: SortValue;
  safeLimit: LimitValue;
};

type PractitionersListingViewProps = {
  data: PractitionersListingViewData;
  basePath?: string;
};

export async function getPractitionersListingData(
  locale: string,
  searchParams: PractitionersListingSearchParams,
): Promise<PractitionersListingViewData> {
  const {
    search = "",
    specialtyCategorySlug = "",
    specialtySlug = "",
    language = "",
    languageCodes,
    country = "",
    practitionerKind = "",
    gender = "",
    duration,
    onlineNow,
    instantBookingEnabled,
    minRating,
    minSessionFee,
    maxSessionFee,
    sort = "recommended",
    page = "1",
    limit = "12",
  } = searchParams;

  const toBool = (value: string | undefined) => value === "true";
  const toOptionalNumber = (value: string | undefined) => {
    if (!value) return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };

  const safeSearch = search.trim();
  const safeSort: SortValue = (VALID_SORT_VALUES as readonly string[]).includes(sort)
    ? (sort as SortValue)
    : "recommended";
  const parsedLimit = parseInt(limit, 10);
  const safeLimit: LimitValue = VALID_LIMIT_VALUES.includes(parsedLimit as LimitValue)
    ? (parsedLimit as LimitValue)
    : 12;
  const safePractitionerKind: "doctor" | "therapist" | "" =
    practitionerKind === "doctor" || practitionerKind === "therapist" ? practitionerKind : "";
  const safeGender: "male" | "female" | "" =
    gender === "male" || gender === "female" ? gender : "";
  const parsedDuration = Number(duration);
  const safeDuration: 30 | 60 | undefined = parsedDuration === 30 || parsedDuration === 60 ? parsedDuration : undefined;
  const safeOnlineNow = toBool(onlineNow);
  const safeInstantBookingEnabled = toBool(instantBookingEnabled);
  const safeMinRatingRaw = toOptionalNumber(minRating);
  const safeMinRating =
    safeMinRatingRaw !== undefined && safeMinRatingRaw >= 1 && safeMinRatingRaw <= 5
      ? safeMinRatingRaw
      : undefined;
  const safeMinSessionFeeRaw = toOptionalNumber(minSessionFee);
  const safeMaxSessionFeeRaw = toOptionalNumber(maxSessionFee);
  const safeMinSessionFee =
    safeMinSessionFeeRaw !== undefined && safeMinSessionFeeRaw >= 0 ? safeMinSessionFeeRaw : undefined;
  const safeMaxSessionFee =
    safeMaxSessionFeeRaw !== undefined && safeMaxSessionFeeRaw >= 0 ? safeMaxSessionFeeRaw : undefined;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  let filters: Awaited<ReturnType<typeof fetchPublicPractitionerFilters>> = {
    specialties: [],
    specialtyCategories: [],
    languages: [],
    countries: [],
    practitionerKinds: [],
    genders: [],
    durations: [],
    ratingThresholds: [],
    feeBounds: { min: 0, max: 0, currency: "USD", step: 5 },
    availability: {
      onlineNowSupported: true,
      availableTodaySupported: true,
      availableThisWeekSupported: true,
    },
  };

  try {
    filters = await fetchPublicPractitionerFilters(locale, {
      duration: safeDuration,
    });
  } catch {
    // Best-effort rendering
  }

  const safeCountry = filters.countries.some((option) => option.value === country.toUpperCase())
    ? country.toUpperCase()
    : "";
  const safeSpecialtyCategorySlug = filters.specialtyCategories.some(
    (option) => option.value === specialtyCategorySlug,
  )
    ? specialtyCategorySlug
    : "";
  const safeSpecialtySlug = filters.specialties.some(
    (option) =>
      option.slug === specialtySlug &&
      (!safeSpecialtyCategorySlug ||
        option.category?.slug === safeSpecialtyCategorySlug),
  )
    ? specialtySlug
    : "";

  const specialtyLabels = Object.fromEntries(
    filters.specialties.map((item) => [
      item.slug,
      locale.startsWith("ar")
        ? item.nameAr ?? item.nameEn ?? item.name
        : item.nameEn ?? item.nameAr ?? item.name,
    ]),
  );
  const languageLabels = Object.fromEntries(filters.languages.map((item) => [item.value, item.label]));
  const countryLabels = Object.fromEntries(
    filters.countries.map((item) => [item.value.toLowerCase(), item.label]),
  );

  const languageParamValues = Array.isArray(languageCodes)
    ? languageCodes
    : typeof languageCodes === "string"
      ? [languageCodes]
      : [];
  const safeLanguageCodes = Array.from(
    new Set(
      [
        ...languageParamValues.flatMap((value) => value.split(",")),
        ...(!languageParamValues.length && language ? [language] : []),
      ]
        .map((value) => value.trim().toLowerCase())
        .filter((value) => filters.languages.some((option) => option.value === value)),
    ),
  );

  let fetchError = false;
  let items: Awaited<ReturnType<typeof fetchPublicPractitioners>>["items"] = [];
  let pagination: Awaited<ReturnType<typeof fetchPublicPractitioners>>["pagination"] = {
    page: currentPage,
    limit: safeLimit,
    totalItems: 0,
    totalPages: 0,
  };

  try {
    const data = await fetchPublicPractitioners(locale, {
      search: safeSearch || undefined,
      specialtyCategorySlug: safeSpecialtyCategorySlug || undefined,
      specialtySlug: safeSpecialtySlug || undefined,
      languageCodes: safeLanguageCodes.length > 0 ? safeLanguageCodes : undefined,
      country: safeCountry || undefined,
      practitionerKind: safePractitionerKind || undefined,
      gender: safeGender || undefined,
      duration: safeDuration,
      onlineNow: safeOnlineNow || undefined,
      instantBookingEnabled: safeInstantBookingEnabled || undefined,
      minRating: safeMinRating,
      minSessionFee: safeMinSessionFee,
      maxSessionFee: safeMaxSessionFee,
      sort: safeSort,
      page: currentPage,
      limit: safeLimit,
    });
    items = data.items;
    pagination = data.pagination;
  } catch {
    fetchError = true;
  }

  return {
    filters,
    specialtyLabels,
    languageLabels,
    countryLabels,
    items,
    pagination,
    fetchError,
    currentPage,
    safeSearch,
    safeSpecialtyCategorySlug,
    safeSpecialtySlug,
    safeLanguageCodes,
    safeCountry,
    safePractitionerKind,
    safeGender,
    safeDuration,
    safeOnlineNow,
    safeInstantBookingEnabled,
    safeMinRating,
    safeMinSessionFee,
    safeMaxSessionFee,
    safeSort,
    safeLimit,
  };
}

export default async function PractitionersListingView({
  data,
  basePath = "/practitioners",
}: PractitionersListingViewProps) {
  const tPage = await getTranslations("practitioners-listing.page");
  const tSort = await getTranslations("practitioners-listing.sort");
  const tFilter = await getTranslations("practitioners-listing.filter");

  const {
    filters,
    specialtyLabels,
    languageLabels,
    items,
    pagination,
    fetchError,
    currentPage,
    safeSearch,
    safeSpecialtyCategorySlug,
    safeSpecialtySlug,
    safeLanguageCodes,
    safeCountry,
    safePractitionerKind,
    safeGender,
    safeDuration,
    safeOnlineNow,
    safeInstantBookingEnabled,
    safeMinRating,
    safeMinSessionFee,
    safeMaxSessionFee,
    safeSort,
    safeLimit,
  } = data;

  const buildUrlWithParams = (overrides: Record<string, string>) => {
    const qs = new URLSearchParams();
    const current: Record<string, string> = {};
    if (safeSearch) current.search = safeSearch;
    if (safeSpecialtyCategorySlug) current.specialtyCategorySlug = safeSpecialtyCategorySlug;
    if (safeSpecialtySlug) current.specialtySlug = safeSpecialtySlug;
    if (safeLanguageCodes.length > 0) current.languageCodes = safeLanguageCodes.join(",");
    if (safeCountry) current.country = safeCountry;
    if (safePractitionerKind) current.practitionerKind = safePractitionerKind;
    if (safeGender) current.gender = safeGender;
    if (safeDuration) current.duration = String(safeDuration);
    if (safeOnlineNow) current.onlineNow = "true";
    if (safeInstantBookingEnabled) current.instantBookingEnabled = "true";
    if (safeMinRating !== undefined) current.minRating = String(safeMinRating);
    if (safeMinSessionFee !== undefined) current.minSessionFee = String(safeMinSessionFee);
    if (safeMaxSessionFee !== undefined) current.maxSessionFee = String(safeMaxSessionFee);
    if (safeSort !== "recommended") current.sort = safeSort;
    if (safeLimit !== 12) current.limit = String(safeLimit);
    if (currentPage > 1) current.page = String(currentPage);

    const merged = { ...current, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });

    const query = qs.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const buildPageUrl = (nextPage: number) =>
    buildUrlWithParams({ page: nextPage > 1 ? String(nextPage) : "" });

  const buildSortUrl = (nextSort: string) =>
    buildUrlWithParams({ sort: nextSort !== "recommended" ? nextSort : "", page: "" });

  const removeFilterUrl = (key: string) =>
    buildUrlWithParams({ [key]: "", page: "" });

  const resultLabel = tPage("resultCount", { count: pagination.totalItems });
  const activeFeeFilter: ActiveFeeFilterContext = {
    duration: safeDuration,
    minSessionFee: safeMinSessionFee,
    maxSessionFee: safeMaxSessionFee,
  };

  // Build active chips for quick removal
  const activeChips: Array<{ key: string; label: string }> = [];
  if (safeSearch) activeChips.push({ key: "search", label: `"${safeSearch}"` });
  if (safeSpecialtySlug) {
    const spec = filters.specialties.find((s) => s.slug === safeSpecialtySlug);
    activeChips.push({ key: "specialtySlug", label: spec?.nameAr ?? spec?.name ?? safeSpecialtySlug });
  }
  if (safeSpecialtyCategorySlug) {
    const cat = filters.specialtyCategories.find((c) => c.value === safeSpecialtyCategorySlug);
    activeChips.push({ key: "specialtyCategorySlug", label: cat?.label ?? safeSpecialtyCategorySlug });
  }
  if (safeGender) {
    const g = filters.genders.find((item) => item.value === safeGender);
    activeChips.push({ key: "gender", label: g?.label ?? safeGender });
  }
  if (safeOnlineNow) activeChips.push({ key: "onlineNow", label: tFilter("onlineNow") });
  if (safeLanguageCodes.length > 0) {
    const langNames = safeLanguageCodes
      .map((code) => filters.languages.find((l) => l.value === code)?.label ?? code)
      .join(", ");
    activeChips.push({ key: "languageCodes", label: langNames });
  }
  if (safeCountry) {
    const c = filters.countries.find((item) => item.value === safeCountry);
    activeChips.push({ key: "country", label: c?.label ?? safeCountry });
  }
  if (safePractitionerKind) {
    const k = filters.practitionerKinds.find((item) => item.value === safePractitionerKind);
    activeChips.push({ key: "practitionerKind", label: k?.label ?? safePractitionerKind });
  }
  if (safeDuration) {
    activeChips.push({ key: "duration", label: safeDuration === 30 ? tFilter("duration30") : tFilter("duration60") });
  }
  if (safeMinRating !== undefined) activeChips.push({ key: "minRating", label: `⭐ ${safeMinRating}+` });
  if (safeMinSessionFee !== undefined || safeMaxSessionFee !== undefined) {
    activeChips.push({ key: "minSessionFee", label: tFilter("sessionFee") });
  }

  return (
    <>
      <ListingPageHero />

      <div className="bg-background px-4 sm:px-6 pb-12 pt-6 lg:px-12 dark:bg-background">
        <div className="mx-auto max-w-7xl">
          {/* Mobile Search & Filter Trigger */}
          <div className="lg:hidden mb-4">
            <FilterControls
              filters={filters}
              limitOptions={VALID_LIMIT_VALUES}
              desktopMode="mobile"
            />
          </div>

          <div className="flex flex-col lg:flex-row items-start gap-6">
            {/* Desktop Compact Sidebar (270px) */}
            <aside className="hidden lg:block w-[270px] shrink-0 sticky top-24">
              <FilterControls
                filters={filters}
                limitOptions={VALID_LIMIT_VALUES}
                desktopMode="sidebar"
              />
            </aside>

            {/* Main Content Area */}
            <main className="min-w-0 flex-1 space-y-4">
              {/* Header Bar: Result Count + Active Filter Chips + Sort */}
              <div className="rounded-[20px] border border-border-light/70 bg-white p-4 shadow-2xs dark:bg-surface-secondary dark:border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-[#1C2F2B] dark:text-white/95">
                    {resultLabel}
                  </h2>

                  {/* Compact Sort Options */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-text-muted font-medium">{tSort("label")}:</span>
                    <div className="flex items-center gap-1">
                      <Link
                        href={buildSortUrl("recommended")}
                        scroll={false}
                        className={`rounded-lg px-2.5 py-1 font-bold transition ${
                          safeSort === "recommended"
                            ? "bg-[#24564F] text-white"
                            : "text-text-secondary hover:bg-[#EEF4EF] dark:hover:bg-white/5"
                        }`}
                      >
                        {tSort("recommended")}
                      </Link>
                      <Link
                        href={buildSortUrl("rating")}
                        scroll={false}
                        className={`rounded-lg px-2.5 py-1 font-bold transition ${
                          safeSort === "rating"
                            ? "bg-[#24564F] text-white"
                            : "text-text-secondary hover:bg-[#EEF4EF] dark:hover:bg-white/5"
                        }`}
                      >
                        {tSort("rating")}
                      </Link>
                      <Link
                        href={buildSortUrl("experience")}
                        scroll={false}
                        className={`rounded-lg px-2.5 py-1 font-bold transition ${
                          safeSort === "experience"
                            ? "bg-[#24564F] text-white"
                            : "text-text-secondary hover:bg-[#EEF4EF] dark:hover:bg-white/5"
                        }`}
                      >
                        {tSort("experience")}
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Active Filter Chips */}
                {activeChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-light/50">
                    <span className="text-xs font-semibold text-text-muted me-1">
                      {tFilter("activeFilters")}:
                    </span>
                    {activeChips.map((chip) => (
                      <Link
                        key={chip.key}
                        href={removeFilterUrl(chip.key)}
                        scroll={false}
                        className="inline-flex items-center gap-1 rounded-full border border-[#24564F]/20 bg-[#EEF4EF] py-0.5 ps-2.5 pe-1.5 text-xs font-bold text-[#24564F] hover:bg-[#24564F]/10 transition dark:bg-white/10 dark:text-[#A7BFAE]"
                      >
                        <span>{chip.label}</span>
                        <X size={12} />
                      </Link>
                    ))}

                    <Link
                      href={basePath}
                      scroll={false}
                      className="text-xs font-bold text-[#24564F] underline hover:text-[#1F4A44] transition ms-2"
                    >
                      {tFilter("clearAll")}
                    </Link>
                  </div>
                )}
              </div>

              {/* Practitioners Grid */}
              {fetchError ? (
                <ListingErrorState basePath={basePath} />
              ) : (
                <>
                  <PractitionerGrid
                    practitioners={items}
                    specialtyLabels={specialtyLabels}
                    languageLabels={languageLabels}
                    activeFeeFilter={activeFeeFilter}
                    basePath={basePath}
                  />

                  {/* Server Pagination */}
                  {pagination.totalPages > 1 ? (
                    <div className="mt-8 flex items-center justify-center gap-2 pt-4">
                      <Link
                        href={buildPageUrl(currentPage - 1)}
                        scroll={false}
                        aria-disabled={currentPage <= 1}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                          currentPage <= 1
                            ? "pointer-events-none border-border-light text-text-muted opacity-40"
                            : "border-border-light bg-white text-text-secondary hover:border-[#24564F] hover:text-[#24564F] dark:border-white/10 dark:bg-surface-secondary"
                        }`}
                      >
                        <ChevronLeft size={16} className="rtl:rotate-180" />
                      </Link>

                      {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map(
                        (listPage) => {
                          const isActive = listPage === currentPage;
                          const isNear =
                            listPage === 1 ||
                            listPage === pagination.totalPages ||
                            Math.abs(listPage - currentPage) <= 1;

                          if (!isNear) {
                            if (listPage === 2 || listPage === pagination.totalPages - 1) {
                              return (
                                <span
                                  key={listPage}
                                  className="flex h-10 w-10 items-center justify-center text-sm text-text-muted"
                                >
                                  ...
                                </span>
                              );
                            }
                            return null;
                          }

                          return (
                            <Link
                              key={listPage}
                              href={buildPageUrl(listPage)}
                              scroll={false}
                              className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-bold transition-colors ${
                                isActive
                                  ? "border-[#24564F] bg-[#24564F] text-white"
                                  : "border-border-light bg-white text-text-secondary hover:border-[#24564F] hover:text-[#24564F] dark:border-white/10 dark:bg-surface-secondary dark:text-white/70"
                              }`}
                            >
                              {listPage}
                            </Link>
                          );
                        },
                      )}

                      <Link
                        href={buildPageUrl(currentPage + 1)}
                        scroll={false}
                        aria-disabled={currentPage >= pagination.totalPages}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                          currentPage >= pagination.totalPages
                            ? "pointer-events-none border-border-light text-text-muted opacity-40"
                            : "border-border-light bg-white text-text-secondary hover:border-[#24564F] hover:text-[#24564F] dark:border-white/10 dark:bg-surface-secondary"
                        }`}
                      >
                        <ChevronRight size={16} className="rtl:rotate-180" />
                      </Link>
                    </div>
                  ) : null}
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
