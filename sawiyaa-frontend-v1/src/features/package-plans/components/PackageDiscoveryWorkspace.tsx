"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal, Package, RefreshCw } from "lucide-react";
import { SurfaceCard, SurfaceHeader, SurfaceToolbar } from "@/components/shared/SurfaceShell";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import Button from "@/components/ui/button/Button";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { usePublicPackageOffers } from "../hooks/use-package-offers";
import { PackageOfferCard } from "./PackageOfferCard";
import type { PackageOfferSortOption } from "../types/package-offers.types";

export default function PackageDiscoveryWorkspace() {
  const t = useTranslations("package-purchases.discovery");
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <SurfaceCard as="section" variant="page">
        <SurfaceHeader
          eyebrow={t("eyebrow")}
          title={t("heading")}
          description={t("subtitle")}
        />
      </SurfaceCard>

      {/* Filter Toolbar */}
      <SurfaceToolbar className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("searchPlaceholder")}
              className="app-control h-11 w-full ps-10 pe-4 text-sm"
            />
          </div>

          {/* Session Count Filter */}
          <select
            value={sessionCount ?? ""}
            onChange={(e) => {
              setSessionCount(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
            className="app-control h-11 w-full px-3 text-sm"
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
            className="app-control h-11 w-full px-3 text-sm"
            aria-label={t("durationFilter")}
          >
            <option value="">{t("durationFilter")}</option>
            <option value="30">{t("duration30")}</option>
            <option value="60">{t("duration60")}</option>
          </select>

          {/* Sort Option */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as PackageOfferSortOption);
              setPage(1);
            }}
            className="app-control h-11 w-full px-3 text-sm font-medium"
            aria-label={t("sortLabel")}
          >
            <option value="recommended">{t("sortOptions.recommended")}</option>
            <option value="highest_rated">{t("sortOptions.highest_rated")}</option>
            <option value="lowest_price">{t("sortOptions.lowest_price")}</option>
            <option value="highest_savings">{t("sortOptions.highest_savings")}</option>
          </select>
        </div>

        {(search || sessionCount || durationMinutes || sort !== "recommended") && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("resetFilters")}
            </button>
          </div>
        )}
      </SurfaceToolbar>

      {/* Main Offers Grid or Content States */}
      {isLoading ? (
        <ListStateSkeleton items={6} heightClass="h-72" />
      ) : isError ? (
        <StateCard
          title={t("emptyHeading")}
          note={t("emptyNote")}
          action={{
            label: t("resetFilters"),
            href: (
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {t("resetFilters")}
              </button>
            ),
          }}
        />
      ) : offers.length === 0 ? (
        <StateCard
          icon={<Package size={36} className="text-primary" />}
          title={t("emptyHeading")}
          note={t("emptyNote")}
          action={{
            label: t("resetFilters"),
            href: (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {t("resetFilters")}
              </button>
            ),
          }}
        />
      ) : (
        <>
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <PackageOfferCard
                key={`${offer.practitioner.id}-${offer.packagePlan.id}`}
                offer={offer}
              />
            ))}
          </section>

          {/* Pagination */}
          {totalPages > 1 && (
            <SurfaceToolbar className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-6">
              <p className="text-xs text-text-secondary">
                {t("pageLabel", { page, totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  size="sm"
                >
                  {t("previous")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  size="sm"
                >
                  {t("next")}
                </Button>
              </div>
            </SurfaceToolbar>
          )}
        </>
      )}
    </div>
  );
}
