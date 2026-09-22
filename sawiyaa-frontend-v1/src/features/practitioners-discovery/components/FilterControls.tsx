"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { Drawer, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { SearchableCombobox } from "@/components/form/SearchableCombobox";
import MultiSelect from "@/components/form/MultiSelect";
import { MoneyText } from "@/components/money/MoneyText";
import { mapPractitionerFilterMoney } from "../lib/practitioner-filter-money";
import { getLocalizedSpecialtyName } from "@/features/specialties/utils/localized-specialty";
import type {
  PractitionerFeeBounds,
  PractitionerFiltersMetadata,
} from "../types/practitioner";

type BooleanValue = "" | "true" | "false";

type Props = {
  filters: PractitionerFiltersMetadata;
  limitOptions: readonly number[];
  desktopMode?: "sidebar" | "mobile" | "inline";
};

function formatFeeValue(
  locale: string,
  value: number,
  currency: PractitionerFeeBounds["currency"],
) {
  const money = mapPractitionerFilterMoney({ amount: value, currencyCode: currency });
  return money ? <MoneyText money={money} /> : null;
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

  if (!hasBounds) {
    return (
      <div className="rounded-xl border border-dashed border-border-light bg-[#FCFAF6] px-3 py-2.5 text-xs text-text-muted">
        {unavailableLabel}
      </div>
    );
  }

  const rangePercent = ((draftMax - draftMin) / Math.max(maxBound - minBound, 1)) * 100;
  const offsetPercent = ((draftMin - minBound) / Math.max(maxBound - minBound, 1)) * 100;

  return (
    <div className="space-y-2 rounded-xl border border-border-light/70 bg-[#FCFAF6] p-3 dark:bg-white/5">
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#1C2F2B] dark:text-white/90">
        <span>{formatFeeValue(locale, draftMin, bounds.currency)}</span>
        <span>{formatFeeValue(locale, draftMax, bounds.currency)}</span>
      </div>

      <div className="relative h-8">
        <div className="absolute inset-x-1 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border-light" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#24564F]"
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
          onMouseUp={() => onChange(String(draftMin), String(draftMax))}
          onTouchEnd={() => onChange(String(draftMin), String(draftMax))}
          className="pointer-events-none absolute inset-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#24564F] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-xs"
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
          onMouseUp={() => onChange(String(draftMin), String(draftMax))}
          onTouchEnd={() => onChange(String(draftMin), String(draftMax))}
          className="pointer-events-none absolute inset-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#24564F] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-xs"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span>{formatFeeValue(locale, minBound, bounds.currency)}</span>
        {(currentMinFee || currentMaxFee) && (
          <button
            type="button"
            onClick={() => {
              setDraftMin(minBound);
              setDraftMax(maxBound);
              onChange("", "");
            }}
            className="font-bold text-[#24564F] transition hover:underline"
          >
            {resetLabel}
          </button>
        )}
        <span>{formatFeeValue(locale, maxBound, bounds.currency)}</span>
      </div>
    </div>
  );
}

export default function FilterControls({
  filters,
  desktopMode = "sidebar",
}: Props) {
  const t = useTranslations("practitioners-listing");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  const currentSearch = searchParams.get("search") ?? "";
  const currentSpecialtyCategorySlug = searchParams.get("specialtyCategorySlug") ?? "";
  const currentSpecialtySlug = searchParams.get("specialtySlug") ?? "";
  const currentLanguageCodes = Array.from(
    new Set(
      [
        ...searchParams.getAll("languageCodes"),
        ...(searchParams.get("language") ? [searchParams.get("language") ?? ""] : []),
      ]
        .flatMap((value) => value.split(","))
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const currentCountry = searchParams.get("country") ?? "";
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

  const updateSearchInput = (nextSearch: string) => {
    setSearchInput(nextSearch);
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      updateParam("search", nextSearch.trim());
    }, 350);
  };

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setSearchInput("");
    setDrawerOpen(false);
  };

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

  const specialtyOptions = useMemo(() => [
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
  ], [currentSpecialtyCategorySlug, filters.specialties, locale, t]);

  const categoryOptions = useMemo(() => [
    { value: "", label: t("filter.allCategories") },
    ...filters.specialtyCategories.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  ], [filters.specialtyCategories, t]);

  const genderOptions = useMemo(() => [
    { value: "", label: t("filter.allGenders") },
    ...filters.genders.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  ], [filters.genders, t]);

  const languageOptions = useMemo(() => filters.languages.map((item) => ({
    value: item.value,
    text: item.label,
    selected: currentLanguageCodes.includes(item.value),
  })), [currentLanguageCodes, filters.languages]);

  const countryOptions = useMemo(() => [
    { value: "", label: t("filter.allCountries") },
    ...filters.countries.map((item) => ({
      value: item.value,
      label: item.label,
      description: item.description ?? undefined,
      searchText: [item.label, item.description, item.value].filter(Boolean).join(" "),
    })),
  ], [filters.countries, t]);

  const kindOptions = useMemo(() => [
    { value: "", label: t("filter.allTypes") },
    ...filters.practitionerKinds.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  ], [filters.practitionerKinds, t]);

  const durationOptions = useMemo(() => [
    { value: "", label: t("filter.allDurations") },
    ...filters.durations.map((item) => ({
      value: String(item.value),
      label: item.label,
    })),
  ], [filters.durations, t]);

  const ratingOptions = useMemo(() => [
    { value: "", label: t("filter.anyRating") },
    ...filters.ratingThresholds.map((item) => ({
      value: String(item.value),
      label: item.label,
    })),
  ], [filters.ratingThresholds, t]);

  const activeFiltersCount = [
    currentSpecialtyCategorySlug,
    currentSpecialtySlug,
    currentLanguageCodes.join(","),
    currentCountry,
    currentPractitionerKind,
    currentGender,
    currentDuration,
    currentOnlineNow,
    currentMinRating,
    currentMinSessionFee,
    currentMaxSessionFee,
  ].filter(Boolean).length;

  // Render Compact Desktop Sidebar
  if (desktopMode === "sidebar") {
    return (
      <div className="rounded-[24px] border border-border-light/70 bg-white p-4 shadow-2xs dark:bg-surface-secondary dark:border-white/10 space-y-4">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-border-light/60 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[#24564F]" />
            <h3 className="text-sm font-bold text-[#1C2F2B] dark:text-white">
              {t("filter.title")}
            </h3>
            {activeFiltersCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#24564F] text-[10px] font-bold text-white">
                {activeFiltersCount}
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#24564F] hover:underline"
            >
              <RotateCcw size={11} />
              <span>{t("filter.clearAll")}</span>
            </button>
          )}
        </div>

        {/* 1. Search */}
        <div>
          <label className="block mb-1 text-xs font-bold text-text-secondary">
            {t("search.button")}
          </label>
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => updateSearchInput(e.target.value)}
              placeholder={t("search.placeholder")}
              className="h-10 w-full rounded-xl border border-border-light/80 bg-[#FCFAF6] ps-9 pe-7 text-xs text-[#1C2F2B] placeholder:text-text-muted focus:border-[#24564F] focus:bg-white focus:outline-none dark:bg-white/5 dark:text-white dark:border-white/10"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => updateSearchInput("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>
        </div>

        {/* 2. Availability (Instant / Online) */}
        <div>
          <label className="block mb-1 text-xs font-bold text-text-secondary">
            {t("filter.availability")}
          </label>
          <button
            type="button"
            onClick={() => {
              const next = currentOnlineNow === "true" ? "" : "true";
              updateParam("onlineNow", next);
            }}
            className={`sawiyaa-btn-press flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition ${
              currentOnlineNow === "true"
                ? "border-[#24564F] bg-[#EEF4EF] text-[#24564F] dark:bg-primary/20 dark:text-primary-light"
                : "border-border-light/80 bg-[#FCFAF6] text-text-secondary hover:border-[#24564F]/40 dark:bg-white/5 dark:text-white/80"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  currentOnlineNow === "true" ? "bg-emerald-500 animate-pulse" : "bg-text-muted/60"
                }`}
              />
              <span>{t("filter.onlineNow")}</span>
            </div>
            {currentOnlineNow === "true" && <X size={12} />}
          </button>
        </div>

        {/* 3. Specialty */}
        <div>
          <label className="block mb-1 text-xs font-bold text-text-secondary">
            {t("filter.specialty")}
          </label>
          <div className="relative">
            <select
              value={currentSpecialtySlug}
              onChange={(e) => updateParam("specialtySlug", e.target.value)}
              className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border-light/80 bg-[#FCFAF6] ps-3 pe-7 text-xs font-semibold text-[#1C2F2B] dark:bg-white/5 dark:text-white dark:border-white/10 focus:border-[#24564F] focus:outline-none"
            >
              {specialtyOptions.map((opt, i) => (
                <option key={`${opt.value}-${i}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
          </div>
        </div>

        {/* 4. Gender */}
        <div>
          <label className="block mb-1 text-xs font-bold text-text-secondary">
            {t("filter.gender")}
          </label>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#FCFAF6] p-1 border border-border-light/80 dark:bg-white/5">
            {genderOptions.map((opt) => {
              const isSelected = currentGender === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateParam("gender", opt.value)}
                  className={`rounded-lg py-1.5 text-xs font-bold transition ${
                    isSelected
                      ? "bg-white text-[#24564F] shadow-2xs dark:bg-white/15 dark:text-white"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Fee Range Slider */}
        <div>
          <label className="block mb-1 text-xs font-bold text-text-secondary">
            {t("filter.sessionFee")}
          </label>
          <FeeRangeSlider
            locale={locale}
            bounds={filters.feeBounds}
            currentMinFee={currentMinSessionFee}
            currentMaxFee={currentMaxSessionFee}
            onChange={(min, max) =>
              updateParams({
                minSessionFee: min,
                maxSessionFee: max,
              })
            }
            minLabel={t("filter.minFeeLabel")}
            maxLabel={t("filter.maxFeeLabel")}
            resetLabel={t("filter.feeReset")}
            unavailableLabel={t("filter.feeUnavailable")}
          />
        </div>

        {/* 6. Language */}
        <div>
          <MultiSelect
            label={t("filter.language")}
            options={languageOptions}
            value={currentLanguageCodes}
            onChange={(selected) => updateParam("languageCodes", selected.join(","))}
            placeholder={t("filter.language")}
          />
        </div>

        {/* 7. Country */}
        <div>
          <label className="block mb-1 text-xs font-bold text-text-secondary">
            {t("filter.country")}
          </label>
          <SearchableCombobox
            options={countryOptions}
            value={currentCountry}
            onChange={(val) => updateParam("country", val)}
            placeholder={t("filter.countrySearchPlaceholder")}
            emptyMessage={t("filter.countryEmpty")}
          />
        </div>

        {/* 8. Duration */}
        <div>
          <label className="block mb-1 text-xs font-bold text-text-secondary">
            {t("filter.sessionDuration")}
          </label>
          <div className="relative">
            <select
              value={currentDuration}
              onChange={(e) => updateParam("duration", e.target.value)}
              className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border-light/80 bg-[#FCFAF6] ps-3 pe-7 text-xs font-semibold text-[#1C2F2B] dark:bg-white/5 dark:text-white dark:border-white/10 focus:border-[#24564F] focus:outline-none"
            >
              {durationOptions.map((opt, i) => (
                <option key={`${opt.value}-${i}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
          </div>
        </div>

        {/* 9. Rating */}
        <div>
          <label className="block mb-1 text-xs font-bold text-text-secondary">
            {t("filter.rating")}
          </label>
          <div className="relative">
            <select
              value={currentMinRating}
              onChange={(e) => updateParam("minRating", e.target.value)}
              className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border-light/80 bg-[#FCFAF6] ps-3 pe-7 text-xs font-semibold text-[#1C2F2B] dark:bg-white/5 dark:text-white dark:border-white/10 focus:border-[#24564F] focus:outline-none"
            >
              {ratingOptions.map((opt, i) => (
                <option key={`${opt.value}-${i}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
          </div>
        </div>
      </div>
    );
  }

  // Mobile Top Bar
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => updateSearchInput(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-11 w-full rounded-xl border border-border-light/80 bg-white ps-9 pe-8 text-xs text-[#1C2F2B] focus:border-[#24564F] focus:outline-none dark:bg-surface-secondary dark:text-white dark:border-white/10"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => updateSearchInput("")}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={`sawiyaa-btn-press inline-flex h-11 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition ${
            activeFiltersCount > 0
              ? "border-[#24564F] bg-[#24564F] text-white"
              : "border-border-light/80 bg-white text-[#1C2F2B] dark:bg-surface-secondary dark:text-white dark:border-white/10"
          }`}
        >
          <SlidersHorizontal size={14} />
          <span>{t("filter.openFilters")}</span>
          {activeFiltersCount > 0 ? (
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#24564F]">
              {activeFiltersCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Mobile Drawer */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <ModalHeader
          title={
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-[#24564F]" />
              <span className="text-base font-bold text-[#1C2F2B] dark:text-white">
                {t("filter.title")}
              </span>
            </div>
          }
        />

        <ModalBody>
          <div className="space-y-4 p-1">
            {/* Category */}
            <div>
              <label className="block mb-1 text-xs font-bold text-text-secondary">
                {t("filter.category")}
              </label>
              <div className="relative">
                <select
                  value={currentSpecialtyCategorySlug}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border-light bg-[#FCFAF6] ps-3 pe-8 text-xs text-[#1C2F2B] dark:bg-white/5 dark:text-white"
                >
                  {categoryOptions.map((opt, i) => (
                    <option key={`${opt.value}-${i}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>
            </div>

            {/* Specialty */}
            <div>
              <label className="block mb-1 text-xs font-bold text-text-secondary">
                {t("filter.specialty")}
              </label>
              <div className="relative">
                <select
                  value={currentSpecialtySlug}
                  onChange={(e) => updateParam("specialtySlug", e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border-light bg-[#FCFAF6] ps-3 pe-8 text-xs text-[#1C2F2B] dark:bg-white/5 dark:text-white"
                >
                  {specialtyOptions.map((opt, i) => (
                    <option key={`${opt.value}-${i}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>
            </div>

            {/* Availability */}
            <div>
              <button
                type="button"
                onClick={() => {
                  const next = currentOnlineNow === "true" ? "" : "true";
                  updateParam("onlineNow", next);
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                  currentOnlineNow === "true"
                    ? "border-[#24564F] bg-[#EEF4EF] text-[#24564F]"
                    : "border-border-light bg-[#FCFAF6] text-text-secondary"
                }`}
              >
                <span>{t("filter.onlineNow")}</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    currentOnlineNow === "true" ? "bg-emerald-500 animate-pulse" : "bg-text-muted/60"
                  }`}
                />
              </button>
            </div>

            {/* Gender */}
            <div>
              <label className="block mb-1 text-xs font-bold text-text-secondary">
                {t("filter.gender")}
              </label>
              <div className="relative">
                <select
                  value={currentGender}
                  onChange={(e) => updateParam("gender", e.target.value)}
                  className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border-light bg-[#FCFAF6] ps-3 pe-8 text-xs text-[#1C2F2B]"
                >
                  {genderOptions.map((opt, i) => (
                    <option key={`${opt.value}-${i}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>
            </div>

            {/* Fee Range Slider */}
            <div>
              <label className="block mb-1 text-xs font-bold text-text-secondary">
                {t("filter.sessionFee")}
              </label>
              <FeeRangeSlider
                locale={locale}
                bounds={filters.feeBounds}
                currentMinFee={currentMinSessionFee}
                currentMaxFee={currentMaxSessionFee}
                onChange={(min, max) =>
                  updateParams({
                    minSessionFee: min,
                    maxSessionFee: max,
                  })
                }
                minLabel={t("filter.minFeeLabel")}
                maxLabel={t("filter.maxFeeLabel")}
                resetLabel={t("filter.feeReset")}
                unavailableLabel={t("filter.feeUnavailable")}
              />
            </div>

            {/* Languages */}
            <div>
              <MultiSelect
                label={t("filter.language")}
                options={languageOptions}
                value={currentLanguageCodes}
                onChange={(selected) => updateParam("languageCodes", selected.join(","))}
                placeholder={t("filter.language")}
              />
            </div>

            {/* Country */}
            <div>
              <label className="block mb-1 text-xs font-bold text-text-secondary">
                {t("filter.country")}
              </label>
              <SearchableCombobox
                options={countryOptions}
                value={currentCountry}
                onChange={(val) => updateParam("country", val)}
                placeholder={t("filter.countrySearchPlaceholder")}
                emptyMessage={t("filter.countryEmpty")}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex items-center justify-between w-full gap-3">
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-bold text-text-secondary hover:text-text-primary"
            >
              {t("filter.clearAll")}
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="sawiyaa-btn-press inline-flex items-center justify-center rounded-xl bg-[#24564F] px-6 py-2 text-xs font-bold text-white shadow-xs"
            >
              {t("filter.apply")}
            </button>
          </div>
        </ModalFooter>
      </Drawer>
    </div>
  );
}
