import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ListingPageHero from "./ListingPageHero";
import FilterControls from "./FilterControls";
import PractitionerGrid from "./PractitionerGrid";
import ListingErrorState from "./ListingErrorState";
import { fetchPublicPractitioners } from "../api/practitioners-ssr.api";
import { COUNTRY_CODES, LANGUAGE_CODES } from "../types/practitioner";
import { fetchPublicSpecialties } from "@/features/specialties-public/api/specialties-ssr.api";

const VALID_SORT_VALUES = ["recommended", "experience", "rating"] as const;
const VALID_LIMIT_VALUES = [6, 12, 24] as const;
type SortValue = (typeof VALID_SORT_VALUES)[number];
type LimitValue = (typeof VALID_LIMIT_VALUES)[number];

export type PractitionersListingSearchParams = {
  search?: string;
  specialtyCategorySlug?: string;
  specialtySlug?: string;
  language?: string;
  country?: string;
  practitionerKind?: string;
  gender?: string;
  duration?: string;
  onlineNow?: string;
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
  specialties: Array<{ slug: string; name: string; categorySlug: string | null }>;
  specialtyCategories: Array<{ slug: string; name: string }>;
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
  safeLanguage: string;
  safeCountry: string;
  safePractitionerKind: "doctor" | "therapist" | "";
  safeGender: "male" | "female" | "";
  safeDuration: 30 | 60 | undefined;
  safeOnlineNow: boolean;
  safeAvailableToday: boolean;
  safeAvailableThisWeek: boolean;
  safeAcceptsCoupon: boolean | undefined;
  safeAcceptsPackage: boolean | undefined;
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
    country = "",
    practitionerKind = "",
    gender = "",
    duration,
    onlineNow,
    availableToday,
    availableThisWeek,
    acceptsCoupon,
    acceptsPackage,
    minRating,
    minSessionFee,
    maxSessionFee,
    sort = "recommended",
    page = "1",
    limit = "12",
  } = searchParams;

  const toBool = (value: string | undefined) => value === "true";
  const toOptionalBool = (value: string | undefined): boolean | undefined => {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  };
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
  const safeLanguage = (LANGUAGE_CODES as readonly string[]).includes(language) ? language : "";
  const safeCountry = (COUNTRY_CODES as readonly string[]).includes(country as (typeof COUNTRY_CODES)[number])
    ? country
    : "";
  const safePractitionerKind: "doctor" | "therapist" | "" =
    practitionerKind === "doctor" || practitionerKind === "therapist" ? practitionerKind : "";
  const safeGender: "male" | "female" | "" =
    gender === "male" || gender === "female" ? gender : "";
  const parsedDuration = Number(duration);
  const safeDuration: 30 | 60 | undefined = parsedDuration === 30 || parsedDuration === 60 ? parsedDuration : undefined;
  const safeOnlineNow = toBool(onlineNow);
  const safeAvailableToday = toBool(availableToday);
  const safeAvailableThisWeek = toBool(availableThisWeek);
  const safeAcceptsCoupon = toOptionalBool(acceptsCoupon);
  const safeAcceptsPackage = toOptionalBool(acceptsPackage);
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

  let specialties: Array<{
    slug: string;
    name: string;
    categorySlug: string | null;
    categoryName: string | null;
  }> = [];
  try {
    const data = await fetchPublicSpecialties(locale);
    specialties = data.specialties
      .filter((item) => item.isActive)
      .map((item) => ({
        slug: item.slug,
        name: item.name ?? item.slug,
        categorySlug: item.category?.slug ?? null,
        categoryName: item.category?.name ?? null,
      }));
  } catch {
    // Best-effort rendering: listing still works even if specialties are unavailable.
  }

  const specialtyCategories = Array.from(
    new Map(
      specialties.filter((item) => item.categorySlug).map((item) => [
        item.categorySlug!,
        item.categoryName ?? item.categorySlug!,
      ]),
    ).values(),
  ).map(([slug, name]) => ({
    slug,
    name,
  }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const knownCategorySlugs = new Set(specialties.map((item) => item.categorySlug).filter(Boolean) as string[]);
  const safeSpecialtyCategorySlug =
    specialtyCategorySlug && knownCategorySlugs.has(specialtyCategorySlug)
      ? specialtyCategorySlug
      : "";
  const knownSlugs = new Set(specialties.map((item) => item.slug));
  const safeSpecialtySlug =
    specialtySlug &&
    knownSlugs.has(specialtySlug) &&
    (!safeSpecialtyCategorySlug ||
      specialties.some(
        (item) =>
          item.slug === specialtySlug &&
          item.categorySlug === safeSpecialtyCategorySlug,
      ))
      ? specialtySlug
      : "";
  const specialtyLabels = Object.fromEntries(specialties.map((item) => [item.slug, item.name]));

  const tLanguages = await getTranslations("practitioners-listing.languages");
  const languageLabels = Object.fromEntries(
    LANGUAGE_CODES.map((code) => [code, tLanguages(code)]),
  );
  const tCountries = await getTranslations("practitioners-listing.countries");
  const countryLabels = Object.fromEntries(COUNTRY_CODES.map((code) => [code, tCountries(code)]));

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
      specialtySlug: safeSpecialtySlug || undefined,
      language: safeLanguage || undefined,
      country: safeCountry || undefined,
      practitionerKind: safePractitionerKind || undefined,
      gender: safeGender || undefined,
      duration: safeDuration,
      onlineNow: safeOnlineNow || undefined,
      availableToday: safeAvailableToday || undefined,
      availableThisWeek: safeAvailableThisWeek || undefined,
      acceptsCoupon: safeAcceptsCoupon,
      acceptsPackage: safeAcceptsPackage,
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
    specialties,
    specialtyCategories,
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
    safeLanguage,
    safeCountry,
    safePractitionerKind,
    safeGender,
    safeDuration,
    safeOnlineNow,
    safeAvailableToday,
    safeAvailableThisWeek,
    safeAcceptsCoupon,
    safeAcceptsPackage,
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
  const {
    specialties,
    specialtyCategories,
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
    safeLanguage,
    safeCountry,
    safePractitionerKind,
    safeGender,
    safeDuration,
    safeOnlineNow,
    safeAvailableToday,
    safeAvailableThisWeek,
    safeAcceptsCoupon,
    safeAcceptsPackage,
    safeMinRating,
    safeMinSessionFee,
    safeMaxSessionFee,
    safeSort,
    safeLimit,
  } = data;

  const buildPageUrl = (nextPage: number) => {
    const qs = new URLSearchParams();
    if (safeSearch) qs.set("search", safeSearch);
    if (safeSpecialtyCategorySlug) qs.set("specialtyCategorySlug", safeSpecialtyCategorySlug);
    if (safeSpecialtySlug) qs.set("specialtySlug", safeSpecialtySlug);
    if (safeLanguage) qs.set("language", safeLanguage);
    if (safeCountry) qs.set("country", safeCountry);
    if (safePractitionerKind) qs.set("practitionerKind", safePractitionerKind);
    if (safeGender) qs.set("gender", safeGender);
    if (safeDuration) qs.set("duration", String(safeDuration));
    if (safeOnlineNow) qs.set("onlineNow", "true");
    if (safeAvailableToday) qs.set("availableToday", "true");
    if (safeAvailableThisWeek) qs.set("availableThisWeek", "true");
    if (safeAcceptsCoupon !== undefined) qs.set("acceptsCoupon", String(safeAcceptsCoupon));
    if (safeAcceptsPackage !== undefined) qs.set("acceptsPackage", String(safeAcceptsPackage));
    if (safeMinRating !== undefined) qs.set("minRating", String(safeMinRating));
    if (safeMinSessionFee !== undefined) qs.set("minSessionFee", String(safeMinSessionFee));
    if (safeMaxSessionFee !== undefined) qs.set("maxSessionFee", String(safeMaxSessionFee));
    if (safeSort !== "recommended") qs.set("sort", safeSort);
    if (safeLimit !== 12) qs.set("limit", String(safeLimit));
    if (nextPage > 1) qs.set("page", String(nextPage));
    const query = qs.toString();
    return query ? `?${query}` : "";
  };

  const resultLabel =
    pagination.totalItems === 1
      ? tPage("resultCountSingle")
      : tPage("resultCount", { count: pagination.totalItems });
  const startItem = pagination.totalItems === 0 ? 0 : (currentPage - 1) * safeLimit + 1;
  const endItem = Math.min(currentPage * safeLimit, pagination.totalItems);

  return (
    <>
      <ListingPageHero totalCount={pagination.totalItems} filteredCount={pagination.totalItems} />

      <div className="bg-background px-6 pb-8 pt-3 dark:bg-background">
        <div className="mx-auto max-w-7xl space-y-3">
          <FilterControls
            specialties={specialties}
            specialtyCategories={specialtyCategories}
            languageCodes={LANGUAGE_CODES}
            languageLabels={languageLabels}
            countryCodes={COUNTRY_CODES}
            countryLabels={countryLabels}
            limitOptions={VALID_LIMIT_VALUES}
          />

          <div className="lg:flex lg:items-start lg:gap-4 ltr:lg:flex-row rtl:lg:flex-row-reverse">
            <section className="min-w-0 flex-1 space-y-4">
              <div className="rounded-[20px] border border-border-light bg-surface px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-semibold text-text-primary dark:text-white/90">
                    {resultLabel}
                  </div>
                  <div className="text-xs text-text-muted">
                    {startItem}-{endItem} / {pagination.totalItems}
                  </div>
                </div>
              </div>

              {fetchError ? (
                <ListingErrorState basePath={basePath} />
              ) : (
                <>
                  <PractitionerGrid
                    practitioners={items}
                    specialtyLabels={specialtyLabels}
                    languageLabels={languageLabels}
                    basePath={basePath}
                  />

                  {pagination.totalPages > 1 ? (
                    <div className="rounded-[20px] border border-border-light bg-surface px-4 py-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
                        <span>
                          {startItem}-{endItem} / {pagination.totalItems}
                        </span>
                        <span className="text-text-muted">
                          {currentPage} / {pagination.totalPages}
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={buildPageUrl(currentPage - 1)}
                          scroll={false}
                          aria-disabled={currentPage <= 1}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                            currentPage <= 1
                              ? "pointer-events-none border-border-light text-text-muted opacity-40"
                              : "border-border-light bg-white text-text-secondary hover:border-primary hover:text-primary dark:border-border-light dark:bg-surface-secondary"
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
                                className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors ${
                                  isActive
                                    ? "border-primary bg-primary text-white"
                                    : "border-border-light bg-white text-text-secondary hover:border-primary hover:text-primary dark:border-border-light dark:bg-surface-secondary dark:text-white/70"
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
                              : "border-border-light bg-white text-text-secondary hover:border-primary hover:text-primary dark:border-border-light dark:bg-surface-secondary"
                          }`}
                        >
                          <ChevronRight size={16} className="rtl:rotate-180" />
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </section>

            <div className="w-full lg:max-w-[390px] lg:shrink-0">
              <FilterControls
                specialties={specialties}
                specialtyCategories={specialtyCategories}
                languageCodes={LANGUAGE_CODES}
                languageLabels={languageLabels}
                countryCodes={COUNTRY_CODES}
                countryLabels={countryLabels}
                limitOptions={VALID_LIMIT_VALUES}
                desktopMode="sidebar"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
