"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Search, X } from "lucide-react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Avatar from "@/components/ui/avatar/Avatar";
import InputField from "@/components/form/input/InputField";
import { AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useAdminPractitioners } from "@/features/admin/practitioners/hooks/use-admin-practitioners";
import type { AdminPractitionerListItem } from "@/features/admin/practitioners/types/admin-practitioners.types";
import { cn } from "@/lib/utils";

export type FeaturedPractitionerCandidate = Pick<
  AdminPractitionerListItem,
  | "id"
  | "slug"
  | "displayName"
  | "avatarUrl"
  | "professionalTitle"
  | "status"
  | "isVerified"
> & {
  email?: string | null;
};

type Props = {
  value: FeaturedPractitionerCandidate | null;
  onChange: (value: FeaturedPractitionerCandidate | null) => void;
  disabled?: boolean;
  error?: string | null;
};

function getInitials(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return "P";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getPractitionerStatusTone(status?: string | null) {
  if (status === "APPROVED") return "success" as const;
  if (status === "PENDING_REVIEW" || status === "DRAFT") return "warning" as const;
  if (status === "SUSPENDED" || status === "INACTIVE" || status === "REJECTED") {
    return "danger" as const;
  }
  return "neutral" as const;
}

export default function FeaturedPractitionerPicker({
  value,
  onChange,
  disabled = false,
  error,
}: Props) {
  const t = useTranslations("admin-featured-practitioners");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const shouldQuery = !disabled;

  const practitionersQuery = useAdminPractitioners(
    {
      search: debouncedSearch.trim() || undefined,
      page: 1,
      limit: 6,
      sort: "recommended",
    },
    shouldQuery,
  );

  const candidates = useMemo(
    () =>
      (practitionersQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        slug: item.slug,
        displayName: item.displayName,
        avatarUrl: item.avatarUrl,
        professionalTitle: item.professionalTitle,
        status: item.status,
        isVerified: item.isVerified,
        email: item.email ?? null,
      })),
    [practitionersQuery.data?.items],
  );

  useEffect(() => {
    if (!value) {
      setSearch("");
    }
  }, [value]);

  const selectedLabel = value?.displayName ?? value?.slug ?? t("picker.noSelection");
  const hasEligibilityWarning = Boolean(value && (value.status !== "APPROVED" || !value.slug));

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="featuredPractitionerSearch">{t("picker.searchLabel")}</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <InputField
            id="featuredPractitionerSearch"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("picker.searchPlaceholder")}
            disabled={disabled}
            className="ps-11"
          />
        </div>
        <p className="mt-1.5 text-xs text-text-muted">{t("picker.searchHint")}</p>
      </div>

      <div className="rounded-[24px] border border-border-light bg-surface-secondary/50 p-4">
        {value ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  src={value.avatarUrl}
                  name={value.displayName ?? value.slug}
                  size="xlarge"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {selectedLabel}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {value.professionalTitle ?? value.email ?? value.slug}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(null)}
                disabled={disabled}
                startIcon={<X className="h-4 w-4" />}
              >
                {t("picker.clear")}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge tone={getPractitionerStatusTone(value.status)}>
                {value.status ? t(`practitionerStatus.${value.status}` as Parameters<typeof t>[0]) : t("picker.statusUnknown")}
              </AdminStatusBadge>
              <AdminStatusBadge tone={value.isVerified ? "success" : "warning"}>
                {value.isVerified ? t("picker.verified") : t("picker.notVerified")}
              </AdminStatusBadge>
            </div>

            <div className="rounded-2xl border border-border-light bg-white p-4">
              <p className="text-sm font-semibold text-text-primary">
                {t("picker.previewTitle")}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-surface-secondary px-4 py-3">
                  <p className="text-xs text-text-muted">{t("picker.previewSlug")}</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{value.slug}</p>
                </div>
                <div className="rounded-2xl bg-surface-secondary px-4 py-3">
                  <p className="text-xs text-text-muted">{t("picker.previewProfile")}</p>
                  <p className="mt-1 truncate text-sm font-medium text-text-primary">
                    /{locale}/practitioners/{value.slug}
                  </p>
                </div>
              </div>
              {hasEligibilityWarning ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {t("picker.ineligibleWarning")}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {t("picker.eligibleNotice")}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border-light bg-white px-4 py-6 text-sm text-text-muted">
            {t("picker.emptySelection")}
          </div>
        )}
      </div>

      {!disabled ? (
        <div className="rounded-[24px] border border-border-light bg-white p-3">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">{t("picker.resultsTitle")}</p>
              <p className="text-xs text-text-muted">{t("picker.resultsHint")}</p>
            </div>
            {practitionersQuery.isFetching ? (
              <span className="inline-flex items-center gap-2 text-xs text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("picker.loading")}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            {candidates.length === 0 ? (
              <div className="rounded-2xl bg-surface-secondary px-4 py-5 text-sm text-text-muted">
                {t("picker.noResults")}
              </div>
            ) : (
              candidates.map((candidate) => {
                const active = candidate.id === value?.id;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(candidate)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-start transition",
                      active
                        ? "border-primary/30 bg-primary-light/35"
                        : "border-border-light bg-white hover:border-primary/20 hover:bg-surface-secondary",
                    )}
                  >
                    <Avatar
                      src={candidate.avatarUrl}
                      name={candidate.displayName ?? candidate.slug}
                      size="large"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">
                            {candidate.displayName ?? candidate.slug}
                          </p>
                          <p className="truncate text-xs text-text-muted">
                            {candidate.professionalTitle ?? candidate.email ?? candidate.slug}
                          </p>
                        </div>
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-light bg-white text-text-muted">
                          {active ? <Check className="h-4 w-4 text-success-600" /> : null}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <AdminStatusBadge tone={getPractitionerStatusTone(candidate.status)}>
                          {candidate.status
                            ? t(`practitionerStatus.${candidate.status}` as Parameters<typeof t>[0])
                            : t("picker.statusUnknown")}
                        </AdminStatusBadge>
                        <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
                          {candidate.slug}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm font-medium text-error-500">{error}</p> : null}
    </div>
  );
}
