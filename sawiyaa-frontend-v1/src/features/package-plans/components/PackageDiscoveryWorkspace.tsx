"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, SlidersHorizontal, Package, RotateCcw, Sparkles, CheckCircle2 } from "lucide-react";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { usePublicPackageOffers } from "../hooks/use-package-offers";
import { PackageOfferCard } from "./PackageOfferCard";
import type { PackageOfferSortOption } from "../types/package-offers.types";

export default function PackageDiscoveryWorkspace() {
  const t = useTranslations("package-purchases.discovery");
  const locale = useLocale();
  const isArabic = locale === "ar";

  const [search, setSearch] = useState("");
  const [sessionCount, setSessionCount] = useState<number | undefined>(undefined);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState<PackageOfferSortOption>("recommended");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);

  const { data, isLoading, isError, refetch } = usePublicPackageOffers({
    page,
    limit,
    search: search.trim() || undefined,
    sessionCount,
    durationMinutes,
    sort,
  });

  const offers = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const handleResetFilters = () => {
    setSearch("");
    setSessionCount(undefined);
    setDurationMinutes(undefined);
    setSort("recommended");
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || sessionCount || durationMinutes || sort !== "recommended");

  return (
    <div className="space-y-6 text-start">
      {/* ── Warm Client-Centric Hero Banner ── */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-r from-primary-light/40 via-teal-50/30 to-white p-5 sm:p-7 shadow-xs dark:from-primary/10 dark:via-surface-secondary dark:to-surface-secondary dark:border-primary/25">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isArabic ? "استمرارية علاجية بأفضل قيمة وتوفير" : "Best Value & Therapeutic Continuity"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary dark:text-white">
              {isArabic ? "باقات الجلسات المخصصة" : t("heading")}
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed text-text-secondary dark:text-text-muted">
              {isArabic
                ? "اختر باقة الجلسات المناسبة مع نخبة من أفضل الأخصائيين المعتمدين، واستمتع بخصومات حصرية على رحلتك العلاجية مع مرونة تامة في حجز المواعيد."
                : t("subtitle")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-2xl border border-border-light bg-white/90 p-3.5 text-center shadow-xs dark:bg-surface-secondary dark:border-border-dark">
              <p className="text-2xl font-extrabold text-primary font-mono">{pagination?.totalItems ?? offers.length}</p>
              <p className="text-[11px] font-semibold text-text-muted mt-0.5">{isArabic ? "باقة متاحة" : "Packages Available"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filter Toolbar ── */}
      <div className="rounded-3xl border border-border-light/80 bg-white p-4 shadow-2xs dark:bg-surface-secondary dark:border-border-dark space-y-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-2xl border border-border-light bg-surface-tertiary/40 py-2.5 ps-10 pe-4 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark"
            />
          </div>

          {/* Session Count Filter */}
          <select
            value={sessionCount ?? ""}
            onChange={(e) => {
              setSessionCount(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
            className="w-full rounded-2xl border border-border-light bg-surface-tertiary/40 py-2.5 px-3 text-xs sm:text-sm font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer"
            aria-label={t("sessionCountFilter")}
          >
            <option value="">{t("sessionCountFilter")}</option>
            <option value="4">{t("sessionCountOption", { count: 4 })}</option>
            <option value="6">{t("sessionCountOption", { count: 6 })}</option>
            <option value="8">{t("sessionCountOption", { count: 8 })}</option>
          </select>

          {/* Duration Filter */}
          <select
            value={durationMinutes ?? ""}
            onChange={(e) => {
              setDurationMinutes(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
            className="w-full rounded-2xl border border-border-light bg-surface-tertiary/40 py-2.5 px-3 text-xs sm:text-sm font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer"
            aria-label={t("durationFilter")}
          >
            <option value="">{t("durationFilter")}</option>
            <option value="30">{t("duration30")}</option>
            <option value="60">{t("duration60")}</option>
          </select>

          {/* Sort Option */}
          <div className="flex gap-2">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as PackageOfferSortOption);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-border-light bg-surface-tertiary/40 py-2.5 px-3 text-xs sm:text-sm font-semibold text-text-primary focus:border-primary focus:bg-white focus:outline-hidden dark:bg-surface-tertiary dark:border-border-dark cursor-pointer"
              aria-label={t("sortLabel")}
            >
              <option value="recommended">{t("sortOptions.recommended")}</option>
              <option value="highest_rated">{t("sortOptions.highest_rated")}</option>
              <option value="lowest_price">{t("sortOptions.lowest_price")}</option>
              <option value="highest_savings">{t("sortOptions.highest_savings")}</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center rounded-2xl border border-border-light bg-white px-3 py-2.5 text-xs font-semibold text-text-secondary hover:border-primary hover:text-text-primary transition dark:bg-surface-secondary dark:border-border-dark cursor-pointer shrink-0"
                title={t("resetFilters")}
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Offers Grid or Content States ── */}
      {isLoading ? (
        <ListStateSkeleton items={6} heightClass="h-72" />
      ) : isError ? (
        <StateCard
          title={t("emptyHeading")}
          note={t("emptyNote")}
          action={{
            label: t("resetFilters"),
            onClick: () => refetch(),
          }}
        />
      ) : offers.length === 0 ? (
        <div className="rounded-3xl border border-border-light/80 bg-white p-8 text-center shadow-xs dark:bg-surface-secondary dark:border-border-dark max-w-md mx-auto space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary dark:bg-primary/20">
            <Package size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-text-primary dark:text-white">
              {t("emptyHeading")}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t("emptyNote")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition cursor-pointer"
          >
            {t("resetFilters")}
          </button>
        </div>
      ) : (
        <>
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <PackageOfferCard
                key={`${offer.practitioner.id}-${offer.packagePlan.id}`}
                offer={offer}
              />
            ))}
          </section>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-border-light bg-white px-5 py-3.5 text-xs font-semibold dark:bg-surface-secondary dark:border-border-dark">
              <p className="text-text-secondary">
                {t("pageLabel", { page, totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border border-border-light bg-white px-3.5 py-1.5 text-text-primary hover:border-primary transition disabled:opacity-40 dark:bg-surface-secondary cursor-pointer"
                >
                  {t("previous")}
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-xl bg-primary px-3.5 py-1.5 text-white hover:bg-primary-hover transition shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  {t("next")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

