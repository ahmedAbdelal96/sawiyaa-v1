"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import Avatar from "@/components/ui/avatar/Avatar";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { AdminStatusBadge } from "@/components/shared/admin/AdminDashboardKit";
import { useEligibleFeaturedPractitionerCandidates } from "../hooks/use-featured-practitioner-candidates";

export type FeaturedPractitionerCandidate = {
  id: string;
  slug: string;
  displayName: string | null;
  avatarUrl: string | null;
  professionalTitle: string | null;
  status: string;
  isVerified: boolean;
};

type Props = {
  value: FeaturedPractitionerCandidate | null;
  onChange: (value: FeaturedPractitionerCandidate | null) => void;
  disabled?: boolean;
  error?: string | null;
};

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
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const shouldQuery = !disabled;

  const containerRef = useRef<HTMLDivElement>(null);

  const practitionersQuery = useEligibleFeaturedPractitionerCandidates(
    debouncedSearch.trim(),
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
        status: "APPROVED" as const,
        isVerified: true as const,
      })),
    [practitionersQuery.data?.items],
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  const handleSelect = (candidate: FeaturedPractitionerCandidate) => {
    onChange(candidate);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Label */}
      <p className="text-sm font-semibold text-text-primary">
        {t("picker.searchLabel")}
      </p>

      {/* Combobox input */}
      <div className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={isOpen ? search : value ? value.displayName ?? value.slug : search}
            onChange={(event) => {
              setSearch(event.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            onClick={() => {
              if (!disabled && !value) setIsOpen(true);
            }}
            placeholder={t("picker.searchPlaceholder")}
            disabled={disabled}
            className={cn(
              "app-control w-full rounded-[18px] border py-2.5 pe-11 ps-11 text-sm",
              isOpen && candidates.length > 0
                ? "border-primary/40 rounded-b-[14px] rounded-t-[18px]"
                : "border-border-light",
            )}
          />
          {value ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <ChevronDown className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          )}
        </div>

        {/* Dropdown popover */}
        {isOpen && !disabled ? (
          <div className="absolute z-50 mt-1 w-full min-w-[280px] overflow-hidden rounded-[18px] border border-border-light bg-white shadow-[0_8px_24px_-8px_rgba(25,52,57,0.18)] dark:bg-surface-secondary">
            <div className="max-h-64 overflow-y-auto py-1">
              {practitionersQuery.isFetching ? (
                <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("picker.loading")}
                </div>
              ) : candidates.length === 0 ? (
                <div className="px-4 py-5 text-center text-sm text-text-muted">
                  {t("picker.noResults")}
                </div>
              ) : (
                candidates.map((candidate) => {
                  const active = candidate.id === value?.id;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => handleSelect(candidate)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-start transition",
                        active
                          ? "bg-primary-light/35"
                          : "hover:bg-surface-secondary",
                      )}
                    >
                      <Avatar
                        src={candidate.avatarUrl}
                        name={candidate.displayName ?? candidate.slug}
                        size="small"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {candidate.displayName ?? candidate.slug}
                        </p>
                        <p className="truncate text-xs text-text-muted">
                          {candidate.professionalTitle ?? candidate.slug}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AdminStatusBadge tone={getPractitionerStatusTone(candidate.status)}>
                          {t("practitionerStatus.APPROVED" as Parameters<typeof t>[0])}
                        </AdminStatusBadge>
                        {active ? (
                          <Check className="h-4 w-4 text-success-600" />
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Selected practitioner summary */}
      {value ? (
        <div className="flex items-center gap-2 rounded-[18px] border border-border-light bg-surface-secondary/50 px-3 py-2">
          <Avatar
            src={value.avatarUrl}
            name={value.displayName ?? value.slug}
            size="small"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {value.displayName ?? value.slug}
            </p>
            <p className="truncate text-xs text-text-muted">
              {value.professionalTitle ?? value.slug}
            </p>
          </div>
          <AdminStatusBadge tone={getPractitionerStatusTone(value.status)}>
            {t("practitionerStatus.APPROVED" as Parameters<typeof t>[0])}
          </AdminStatusBadge>
        </div>
      ) : null}

      {/* Hint text */}
      {!value ? (
        <p className="text-xs text-text-muted">{t("picker.searchHint")}</p>
      ) : null}

      {error ? <p className="text-sm font-medium text-error-500">{error}</p> : null}
    </div>
  );
}
