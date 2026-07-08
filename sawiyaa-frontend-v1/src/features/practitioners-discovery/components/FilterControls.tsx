"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Drawer, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { formatPublicMoney } from "../lib/public-pricing";
import { getLocalizedSpecialtyName } from "@/features/specialties/utils/localized-specialty";
import type {
  PractitionerFeeBounds,
  PractitionerFiltersMetadata,
} from "../types/practitioner";

type BooleanValue = "" | "true" | "false";

type Props = {
  filters: PractitionerFiltersMetadata;
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
  const uniqueOptions = useMemo(() => {
    const seen = new Set<string>();
    return options.filter((option) => {
      const key = option.value;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [options]);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full cursor-pointer appearance-none rounded-xl border border-border-light bg-surface ps-3 pe-8 text-sm text-text-primary ${compact ? "h-11" : "h-12"}`}
      >
        {uniqueOptions.map((option, index) => (
          <option key={`${option.value || "empty"}:${index}`} value={option.value}>
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

function formatFeeValue(
  locale: string,
  value: number,
  currency: PractitionerFeeBounds["currency"],
) {
  return formatPublicMoney(locale, value, currency);
}

function getFeeFilterCopy(
  t: ReturnType<typeof useTranslations<"practitioners-listing">>,
  duration: string,
) {
  if (duration === "30") {
    return {
      title: t("filter.sessionFee30"),
      helper: t("filter.sessionFeeDurationExactHelper"),
    };
  }

  if (duration === "60") {
    return {
      title: t("filter.sessionFee60"),
      helper: t("filter.sessionFeeDurationExactHelper"),
    };
  }

  return {
    title: t("filter.sessionFee"),
    helper: t("filter.sessionFeeAnyDurationHelper"),
  };
}

function FeeRangeSlider({
  locale,
  bounds,
  currentMinFee,
  currentMaxFee,
  onChange,
  minLabel,
  maxLabel,
  resetLabel,
  unavailableLabel,
}: {
  locale: string;
  bounds: PractitionerFeeBounds;
  currentMinFee: string;
  currentMaxFee: string;
  onChange: (nextMin: string, nextMax: string) => void;
  minLabel: string;
  maxLabel: string;
  resetLabel: string;
  unavailableLabel: string;
}) {
  const hasBounds = bounds.max > bounds.min;
  const minBound = bounds.min;
  const maxBound = bounds.max;

  const normalizedMin = currentMinFee ? Number(currentMinFee) : minBound;
  const normalizedMax = currentMaxFee ? Number(currentMaxFee) : maxBound;

  const safeMin = Number.isFinite(normalizedMin)
    ? Math.min(Math.max(normalizedMin, minBound), normalizedMax || maxBound)
    : minBound;
  const safeMax = Number.isFinite(normalizedMax)
    ? Math.max(Math.min(normalizedMax, maxBound), safeMin || minBound)
    : maxBound;

  const [draftMin, setDraftMin] = useState(safeMin);
  const [draftMax, setDraftMax] = useState(safeMax);

  useEffect(() => {
    setDraftMin(safeMin);
    setDraftMax(safeMax);
  }, [safeMin, safeMax]);

  useEffect(() => {
    if (!hasBounds) return;

    const timeoutId = window.setTimeout(() => {
      const nextMin = draftMin <= minBound ? "" : String(draftMin);
      const nextMax = draftMax >= maxBound ? "" : String(draftMax);
      if (nextMin === currentMinFee && nextMax === currentMaxFee) return;
      onChange(nextMin, nextMax);
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [
    currentMaxFee,
    currentMinFee,
    draftMax,
    draftMin,
    hasBounds,
    maxBound,
    minBound,
    onChange,
  ]);

  if (!hasBounds) {
    return (
      <div className="rounded-xl border border-dashed border-border-light bg-surface-secondary px-3 py-4 text-sm text-text-muted">
        {unavailableLabel}
      </div>
    );
  }

  const rangePercent = ((draftMax - draftMin) / Math.max(maxBound - minBound, 1)) * 100;
  const offsetPercent = ((draftMin - minBound) / Math.max(maxBound - minBound, 1)) * 100;

  return (
    <div className="space-y-3 rounded-xl border border-border-light bg-surface-secondary p-3">
      <div className="flex items-center justify-between gap-3 text-sm font-medium text-text-secondary">
        <span>{formatFeeValue(locale, draftMin, bounds.currency)}</span>
        <span>{formatFeeValue(locale, draftMax, bounds.currency)}</span>
      </div>

      <div className="relative h-12">
        <div className="absolute inset-x-1 top-1/2 h-2 -translate-y-1/2 rounded-full bg-border-light" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary"
          style={{
            insetInlineStart: `${offsetPercent}%`,
            width: `${rangePercent}%`,
          }}
        />
        <input
          type="range"
          min={minBound}
          max={maxBound}
          step={bounds.step}
          value={draftMin}
          aria-label={minLabel}
          onChange={(event) => {
            const nextValue = Math.min(Number(event.target.value), draftMax);
            setDraftMin(nextValue);
          }}
          className="pointer-events-none absolute inset-0 h-12 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-surface"
        />
        <input
          type="range"
          min={minBound}
          max={maxBound}
          step={bounds.step}
          value={draftMax}
          aria-label={maxLabel}
          onChange={(event) => {
            const nextValue = Math.max(Number(event.target.value), draftMin);
            setDraftMax(nextValue);
          }}
          className="pointer-events-none absolute inset-0 h-12 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-surface"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{formatFeeValue(locale, minBound, bounds.currency)}</span>
        <button
          type="button"
          onClick={() => {
            setDraftMin(minBound);
            setDraftMax(maxBound);
            onChange("", "");
          }}
          className="font-semibold text-text-secondary transition hover:text-primary"
        >
          {resetLabel}
        </button>
        <span>{formatFeeValue(locale, maxBound, bounds.currency)}</span>
      </div>
    </div>
  );
}

export default function FilterControls({
  filters,
  limitOptions,
  desktopMode = "inline",
}: Props) {
  const t = useTranslations("practitioners-listing");
  const locale = useLocale();
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
    currentMinRating,
    currentMinSessionFee,
    currentMaxSessionFee,
  ].filter(Boolean).length;
  const hasActiveFilters = activeFiltersCount > 0;

  const onCategoryChange = (nextCategorySlug: string) => {
    const selectedSpecialty = filters.specialties.find(
      (item) => item.slug === currentSpecialtySlug,
    );
    const shouldClearSpecialty =
      Boolean(currentSpecialtySlug) &&
      (!selectedSpecialty ||
        (nextCategorySlug && selectedSpecialty.category?.slug !== nextCategorySlug));

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
    ...filters.specialtyCategories.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  ];
  const specialtyOptions = [
    { value: "", label: t("filter.allSpecialties") },
    ...filters.specialties
      .filter((item) =>
        currentSpecialtyCategorySlug ? item.category?.slug === currentSpecialtyCategorySlug : true,
      )
      .map((item) => ({
        value: item.slug,
        label: getLocalizedSpecialtyName(
          {
            name: item.name,
            nameAr: item.nameAr ?? null,
            nameEn: item.nameEn ?? null,
            slug: item.slug,
          },
          locale,
        ),
      })),
  ];
  const languageOptions = [
    { value: "", label: t("filter.allLanguages") },
    ...filters.languages.map((item) => ({ value: item.value, label: item.label })),
  ];
  const countryOptions = [
    { value: "", label: t("filter.allCountries") },
    ...filters.countries.map((item) => ({ value: item.value, label: item.label })),
  ];
  const sortOptions = [
    { value: "recommended", label: t("sort.recommended") },
    { value: "rating", label: t("sort.rating") },
    { value: "experience", label: t("sort.experience") },
  ];
  const kindOptions = [
    { value: "", label: t("filter.allTypes") },
    ...filters.practitionerKinds.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  ];
  const genderOptions = [
    { value: "", label: t("filter.allGenders") },
    ...filters.genders.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  ];
  const durationOptions = [
    { value: "", label: t("filter.allDurations") },
    ...filters.durations.map((item) => ({
      value: String(item.value),
      label: item.label,
    })),
  ];
  const ratingOptions = [
    { value: "", label: t("filter.anyRating") },
    ...filters.ratingThresholds.map((item) => ({
      value: String(item.value),
      label: item.label,
    })),
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
  const feeFilterCopy = getFeeFilterCopy(t, currentDuration);

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

        {/* Available today / this week are hidden until rebuilt on public published availability windows. */}
        {filters.availability.onlineNowSupported ? (
          <div>
            <FilterSectionTitle title={t("filter.availability")} />
            <div className="space-y-3 rounded-xl border border-border-light bg-surface-secondary p-3">
              <p className="text-xs font-medium text-text-secondary">{t("filter.onlineNow")}</p>
              <FilterSelect
                value={currentOnlineNow}
                onChange={(value) => updateParam("onlineNow", value)}
                options={yesNoAllOptions}
              />
            </div>
          </div>
        ) : null}

        {filters.specialtyCategories.length > 0 ? (
          <div>
            <FilterSectionTitle title={t("filter.category")} />
            <FilterSelect
              value={currentSpecialtyCategorySlug}
              onChange={onCategoryChange}
              options={categoryOptions}
            />
          </div>
        ) : null}

        {filters.specialties.length > 0 ? (
          <div>
            <FilterSectionTitle title={t("filter.specialty")} />
            <FilterSelect
              value={currentSpecialtySlug}
              onChange={(value) => updateParam("specialtySlug", value)}
              options={specialtyOptions}
            />
          </div>
        ) : null}

        {filters.languages.length > 0 ? (
          <div>
            <FilterSectionTitle title={t("filter.language")} />
            <FilterSelect
              value={currentLanguage}
              onChange={(value) => updateParam("language", value)}
              options={languageOptions}
            />
          </div>
        ) : null}

        {filters.countries.length > 0 ? (
          <div>
            <FilterSectionTitle title={t("filter.country")} />
            <FilterSelect
              value={currentCountry}
              onChange={(value) => updateParam("country", value)}
              options={countryOptions}
            />
          </div>
        ) : null}

        {filters.practitionerKinds.length > 0 ? (
          <div>
            <FilterSectionTitle title={t("filter.practitionerType")} />
            <FilterSelect
              value={currentPractitionerKind}
              onChange={(value) => updateParam("practitionerKind", value)}
              options={kindOptions}
            />
          </div>
        ) : null}

        {filters.genders.length > 0 ? (
          <div>
            <FilterSectionTitle title={t("filter.gender")} />
            <FilterSelect value={currentGender} onChange={(value) => updateParam("gender", value)} options={genderOptions} />
          </div>
        ) : null}

        {filters.durations.length > 0 ? (
          <div>
            <FilterSectionTitle title={t("filter.sessionDuration")} />
            <FilterSelect
              value={currentDuration}
              onChange={(value) => updateParam("duration", value)}
              options={durationOptions}
            />
          </div>
        ) : null}

        {filters.ratingThresholds.length > 0 ? (
          <div>
            <FilterSectionTitle title={t("filter.rating")} />
            <FilterSelect
              value={currentMinRating}
              onChange={(value) => updateParam("minRating", value)}
              options={ratingOptions}
            />
          </div>
        ) : null}

        <div>
          <FilterSectionTitle title={feeFilterCopy.title} />
          <p className="mb-2 text-xs leading-5 text-text-muted">
            {feeFilterCopy.helper}
          </p>
          <FeeRangeSlider
            locale={locale}
            bounds={filters.feeBounds}
            currentMinFee={currentMinSessionFee}
            currentMaxFee={currentMaxSessionFee}
            onChange={(nextMin, nextMax) =>
              updateParams({
                minSessionFee: nextMin,
                maxSessionFee: nextMax,
              })
            }
            minLabel={t("filter.minFeeLabel")}
            maxLabel={t("filter.maxFeeLabel")}
            resetLabel={t("filter.feeReset")}
            unavailableLabel={t("filter.feeUnavailable")}
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
