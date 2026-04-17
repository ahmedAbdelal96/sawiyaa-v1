"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Drawer, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import type { CountryCode, LanguageCode } from "../types/practitioner";

type SpecialtyOption = { slug: string; name: string; categorySlug: string | null };
type SpecialtyCategoryOption = { slug: string; name: string };
type BooleanValue = "" | "true" | "false";

type Props = {
  specialties: SpecialtyOption[];
  specialtyCategories: SpecialtyCategoryOption[];
  languageCodes: LanguageCode[];
  languageLabels: Record<string, string>;
  countryCodes: CountryCode[];
  countryLabels: Record<string, string>;
  limitOptions: readonly number[];
  desktopMode?: "inline" | "sidebar";
};

function FilterSelect({
  value,
  onChange,
  options,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  compact?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full cursor-pointer appearance-none rounded-xl border border-border-light bg-surface ps-3 pe-8 text-sm text-text-primary ${compact ? "h-11" : "h-12"}`}
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-text-muted"
      />
    </div>
  );
}

function FilterSectionTitle({ title }: { title: string }) {
  return <p className="mb-2 text-sm font-semibold text-text-brand">{title}</p>;
}

export default function FilterControls({
  specialties,
  specialtyCategories,
  languageCodes,
  languageLabels,
  countryCodes,
  countryLabels,
  limitOptions,
  desktopMode = "inline",
}: Props) {
  const t = useTranslations("practitioners-listing");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const searchFormRef = useRef<HTMLFormElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isFirstSearchSyncRef = useRef(true);

  const currentSearch = searchParams.get("search") ?? "";
  const currentSpecialtyCategorySlug = searchParams.get("specialtyCategorySlug") ?? "";
  const currentSpecialtySlug = searchParams.get("specialtySlug") ?? "";
  const currentLanguage = searchParams.get("language") ?? "";
  const currentCountry = searchParams.get("country") ?? "";
  const currentSort = searchParams.get("sort") ?? "recommended";
  const currentLimit = searchParams.get("limit") ?? "12";
  const currentPractitionerKind = searchParams.get("practitionerKind") ?? "";
  const currentGender = searchParams.get("gender") ?? "";
  const currentDuration = searchParams.get("duration") ?? "";
  const currentMinRating = searchParams.get("minRating") ?? "";
  const currentMinSessionFee = searchParams.get("minSessionFee") ?? "";
  const currentMaxSessionFee = searchParams.get("maxSessionFee") ?? "";
  const currentOnlineNow = (searchParams.get("onlineNow") ?? "") as BooleanValue;
  const currentAvailableToday = (searchParams.get("availableToday") ?? "") as BooleanValue;
  const currentAvailableThisWeek = (searchParams.get("availableThisWeek") ?? "") as BooleanValue;
  const currentAcceptsCoupon = (searchParams.get("acceptsCoupon") ?? "") as BooleanValue;
  const currentAcceptsPackage = (searchParams.get("acceptsPackage") ?? "") as BooleanValue;

  const [searchInput, setSearchInput] = useState(currentSearch);
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      params.delete("page");
      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  const updateParam = useCallback(
    (key: string, value: string) => updateParams({ [key]: value }),
    [updateParams],
  );

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    if (isFirstSearchSyncRef.current) {
      isFirstSearchSyncRef.current = false;
      return;
    }
    const nextSearch = searchInput.trim();
    if (nextSearch === currentSearch.trim()) return;
    const timeoutId = window.setTimeout(() => updateParam("search", nextSearch), 350);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput, currentSearch, updateParam]);

  const activeFiltersCount = [
    currentSearch.trim(),
    currentSpecialtyCategorySlug,
    currentSpecialtySlug,
    currentLanguage,
    currentCountry,
    currentPractitionerKind,
    currentGender,
    currentDuration,
    currentOnlineNow,
    currentAvailableToday,
    currentAvailableThisWeek,
    currentAcceptsCoupon,
    currentAcceptsPackage,
    currentMinRating,
    currentMinSessionFee,
    currentMaxSessionFee,
  ].filter(Boolean).length;
  const hasActiveFilters = activeFiltersCount > 0;

  const onCategoryChange = (nextCategorySlug: string) => {
    const selectedSpecialty = specialties.find((item) => item.slug === currentSpecialtySlug);
    const shouldClearSpecialty =
      Boolean(currentSpecialtySlug) &&
      (!selectedSpecialty ||
        (nextCategorySlug && selectedSpecialty.categorySlug !== nextCategorySlug));

    updateParams({
      specialtyCategorySlug: nextCategorySlug,
      specialtySlug: shouldClearSpecialty ? "" : currentSpecialtySlug,
    });
  };

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
    setDrawerOpen(false);
  };

  const onSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParam("search", searchInput.trim());
  };

  const categoryOptions = [
    { value: "", label: t("filter.allCategories") },
    ...specialtyCategories.map((item) => ({ value: item.slug, label: item.name })),
  ];
  const specialtyOptions = [
    { value: "", label: t("filter.allSpecialties") },
    ...specialties
      .filter((item) =>
        currentSpecialtyCategorySlug ? item.categorySlug === currentSpecialtyCategorySlug : true,
      )
      .map((item) => ({ value: item.slug, label: item.name })),
  ];
  const languageOptions = [
    { value: "", label: t("filter.allLanguages") },
    ...languageCodes.map((code) => ({ value: code, label: languageLabels[code] ?? code })),
  ];
  const countryOptions = [
    { value: "", label: t("filter.allCountries") },
    ...countryCodes.map((code) => ({ value: code, label: countryLabels[code] ?? code.toUpperCase() })),
  ];
  const sortOptions = [
    { value: "recommended", label: t("sort.recommended") },
    { value: "rating", label: t("sort.rating") },
    { value: "experience", label: t("sort.experience") },
  ];
  const kindOptions = [
    { value: "", label: t("filter.allTypes") },
    { value: "doctor", label: t("filter.practitionerTypeDoctor") },
    { value: "therapist", label: t("filter.practitionerTypeTherapist") },
  ];
  const genderOptions = [
    { value: "", label: t("filter.allGenders") },
    { value: "male", label: t("filter.genderMale") },
    { value: "female", label: t("filter.genderFemale") },
  ];
  const durationOptions = [
    { value: "", label: t("filter.allDurations") },
    { value: "30", label: t("filter.duration30") },
    { value: "60", label: t("filter.duration60") },
  ];
  const ratingOptions = [
    { value: "", label: t("filter.anyRating") },
    { value: "3", label: t("filter.rating3Up") },
    { value: "4", label: t("filter.rating4Up") },
    { value: "4.5", label: t("filter.rating45Up") },
  ];
  const yesNoAllOptions = [
    { value: "", label: t("filter.any") },
    { value: "true", label: t("filter.yes") },
    { value: "false", label: t("filter.no") },
  ];
  const limitOptionsList = limitOptions.map((option) => ({
    value: String(option),
    label: t("pagination.perPageOption", { count: option }),
  }));

  const filtersPanel = (
    <aside className="rounded-[22px] border border-border-light bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-2xl font-semibold text-text-brand">{t("filter.title")}</p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-text-muted transition hover:text-primary"
          >
            {t("filter.clearAll")}
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        <div>
          <FilterSectionTitle title={t("sort.label")} />
          <FilterSelect value={currentSort} onChange={(value) => updateParam("sort", value)} options={sortOptions} />
        </div>

        <div>
          <FilterSectionTitle title={t("filter.availability")} />
          <div className="space-y-3 rounded-xl border border-border-light bg-surface-secondary p-3">
            <p className="text-xs font-medium text-text-secondary">{t("filter.onlineNow")}</p>
            <FilterSelect
              value={currentOnlineNow}
              onChange={(value) => updateParam("onlineNow", value)}
              options={yesNoAllOptions}
            />
            <p className="text-xs font-medium text-text-secondary">{t("filter.availableToday")}</p>
            <FilterSelect
              value={currentAvailableToday}
              onChange={(value) => updateParam("availableToday", value)}
              options={yesNoAllOptions}
            />
            <p className="text-xs font-medium text-text-secondary">{t("filter.availableThisWeek")}</p>
            <FilterSelect
              value={currentAvailableThisWeek}
              onChange={(value) => updateParam("availableThisWeek", value)}
              options={yesNoAllOptions}
            />
          </div>
        </div>

        <div>
          <FilterSectionTitle title={t("filter.category")} />
          <FilterSelect
            value={currentSpecialtyCategorySlug}
            onChange={onCategoryChange}
            options={categoryOptions}
          />
        </div>

        <div>
          <FilterSectionTitle title={t("filter.specialty")} />
          <FilterSelect
            value={currentSpecialtySlug}
            onChange={(value) => updateParam("specialtySlug", value)}
            options={specialtyOptions}
          />
        </div>

        <div>
          <FilterSectionTitle title={t("filter.language")} />
          <FilterSelect
            value={currentLanguage}
            onChange={(value) => updateParam("language", value)}
            options={languageOptions}
          />
        </div>

        <div>
          <FilterSectionTitle title={t("filter.country")} />
          <FilterSelect
            value={currentCountry}
            onChange={(value) => updateParam("country", value)}
            options={countryOptions}
          />
        </div>

        <div>
          <FilterSectionTitle title={t("filter.practitionerType")} />
          <FilterSelect
            value={currentPractitionerKind}
            onChange={(value) => updateParam("practitionerKind", value)}
            options={kindOptions}
          />
        </div>

        <div>
          <FilterSectionTitle title={t("filter.gender")} />
          <FilterSelect value={currentGender} onChange={(value) => updateParam("gender", value)} options={genderOptions} />
        </div>

        <div>
          <FilterSectionTitle title={t("filter.sessionDuration")} />
          <FilterSelect
            value={currentDuration}
            onChange={(value) => updateParam("duration", value)}
            options={durationOptions}
          />
        </div>

        <div>
          <FilterSectionTitle title={t("filter.rating")} />
          <FilterSelect
            value={currentMinRating}
            onChange={(value) => updateParam("minRating", value)}
            options={ratingOptions}
          />
        </div>

        <div>
          <FilterSectionTitle title={t("filter.sessionFee")} />
          <div className="grid grid-cols-2 gap-2">
            <input
              inputMode="decimal"
              value={currentMinSessionFee}
              onChange={(event) => updateParam("minSessionFee", event.target.value)}
              placeholder={t("filter.minFee")}
              className="h-12 rounded-xl border border-border-light bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted"
            />
            <input
              inputMode="decimal"
              value={currentMaxSessionFee}
              onChange={(event) => updateParam("maxSessionFee", event.target.value)}
              placeholder={t("filter.maxFee")}
              className="h-12 rounded-xl border border-border-light bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted"
            />
          </div>
        </div>

        <div>
          <FilterSectionTitle title={t("filter.acceptsCoupon")} />
          <FilterSelect
            value={currentAcceptsCoupon}
            onChange={(value) => updateParam("acceptsCoupon", value)}
            options={yesNoAllOptions}
          />
        </div>

        <div>
          <FilterSectionTitle title={t("filter.acceptsPackage")} />
          <FilterSelect
            value={currentAcceptsPackage}
            onChange={(value) => updateParam("acceptsPackage", value)}
            options={yesNoAllOptions}
          />
        </div>

        <div>
          <FilterSectionTitle title={t("pagination.perPage")} />
          <FilterSelect value={currentLimit} onChange={(value) => updateParam("limit", value)} options={limitOptionsList} />
        </div>
      </div>
    </aside>
  );

  if (desktopMode === "sidebar") {
    return <div className="hidden lg:block">{filtersPanel}</div>;
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <form
          ref={searchFormRef}
          onSubmit={onSearchSubmit}
          className="flex items-center gap-2 rounded-xl border border-border-light bg-surface px-3 py-2.5 focus-within:border-primary"
        >
          <Search size={16} className="shrink-0 text-text-muted" />
          <input
            name="search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("search.placeholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                updateParam("search", "");
              }}
              className="text-text-muted transition hover:text-text-primary"
              aria-label={t("search.clear")}
            >
              <X size={14} />
            </button>
          ) : null}
        </form>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="relative inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border-light bg-surface px-4 text-sm font-semibold text-text-secondary transition hover:border-primary hover:text-primary lg:hidden"
        >
          <SlidersHorizontal size={16} />
          {t("filter.openFilters")}
          {activeFiltersCount > 0 ? (
            <span className="absolute -end-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {activeFiltersCount}
            </span>
          ) : null}
        </button>
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        side="bottom"
        className="lg:hidden"
        ariaLabel={t("filter.title")}
      >
        <ModalHeader title={t("filter.title")} description={t("filter.activeFilters")} />
        <ModalBody>{filtersPanel}</ModalBody>
        <ModalFooter className="sticky bottom-0">
          <button
            type="button"
            onClick={clearAll}
            className="flex-1 rounded-xl border border-border-light py-3 text-sm font-semibold text-text-secondary transition hover:border-primary hover:text-primary"
          >
            {t("filter.clearAll")}
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            {t("filter.apply")}
          </button>
        </ModalFooter>
      </Drawer>
    </>
  );
}
