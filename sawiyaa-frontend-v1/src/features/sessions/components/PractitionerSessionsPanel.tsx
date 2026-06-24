"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Clock3, Eye, RotateCcw, Search } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import Button from "@/components/ui/button/Button";
import DateField from "@/components/form/input/DateField";
import {
  PractitionerPageHeader,
  PractitionerStatCard,
  PractitionerFilterCard,
  PractitionerTableSection,
  PractitionerStatsGrid,
} from "@/components/shared/practitioner/PractitionerWorkspaceKit";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { usePractitionerSessions } from "../hooks/use-sessions";
import { usePractitionerProfile } from "@/features/practitioners/hooks/use-practitioners";
import { formatPractitionerOrViewerDateTime, formatTimeZoneLabel } from "@/lib/time-formatting";
import SessionStatusBadge from "./SessionStatusBadge";
import type { SessionListItem } from "../types/sessions.types";

type PractitionerPresentationFilter =
  | "all"
  | "joinable"
  | "live"
  | "upcoming"
  | "finished"
  | "unavailable";

function parseDateOnlyToStartIso(value: string): string | undefined {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return undefined;

  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseDateOnlyToEndIso(value: string): string | undefined {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return undefined;

  const date = new Date(year, month - 1, day, 23, 59, 59, 999);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default function PractitionerSessionsPanel() {
  const t = useTranslations("sessions");
  const locale = useLocale();
  const router = useRouter();
  const profileQuery = usePractitionerProfile();
  const practitionerTimeZone = profileQuery.data?.profile.timezone ?? null;
  const practitionerTimeZoneLabel = practitionerTimeZone
    ? formatTimeZoneLabel(practitionerTimeZone, {
        locale,
      })
    : null;

  const [search, setSearch] = useState("");
  const [presentationFilter, setPresentationFilter] =
    useState<PractitionerPresentationFilter>("all");
  const [scheduledFrom, setScheduledFrom] = useState("");
  const [scheduledTo, setScheduledTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);

  const debouncedSearch = useDebouncedValue(search, 300);
  const effectiveSearch = search.trim() ? debouncedSearch.trim() : "";

  const queryParams = useMemo(
    () => ({
      query: effectiveSearch || undefined,
      presentationFilter:
        presentationFilter === "all" ? undefined : presentationFilter,
      scheduledFrom: scheduledFrom ? parseDateOnlyToStartIso(scheduledFrom) : undefined,
      scheduledTo: scheduledTo ? parseDateOnlyToEndIso(scheduledTo) : undefined,
      page,
      limit,
    }),
    [effectiveSearch, limit, page, presentationFilter, scheduledFrom, scheduledTo],
  );

  const { data, isLoading, isError, refetch } = usePractitionerSessions(queryParams);
  const sessions = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;
  const hasActiveFilters = Boolean(
    search.trim() || presentationFilter !== "all" || scheduledFrom || scheduledTo,
  );

  const clearFilters = () => {
    setSearch("");
    setPresentationFilter("all");
    setScheduledFrom("");
    setScheduledTo("");
    setPage(1);
  };

  const openSession = (sessionId: string) => {
    router.push(`/practitioner/sessions/${sessionId}` as never);
  };

  const columns = useMemo<ColumnDef<SessionListItem>[]>(
    () => [
      {
        id: "sessionCode",
        header: t("practitioner.list.table.reference"),
        accessor: (row) => row.sessionCode,
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-text-primary dark:text-white/95">
              {row.sessionCode}
            </p>
          </div>
        ),
      },
      {
        id: "patient",
        header: t("practitioner.list.table.patient"),
        accessor: (row) => row.patient?.displayName ?? "",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {row.patient?.displayName ?? t("practitioner.list.table.unknownPatient")}
            </p>
          </div>
        ),
      },
      {
        id: "scheduledStartAt",
        header: t("practitioner.list.table.scheduledAt"),
        accessor: (row) => row.scheduledStartAt ?? "",
        cell: (row) => (
          <div className="min-w-0">
            {row.scheduledStartAt ? (
              <p className="text-sm text-text-secondary">
                {formatPractitionerOrViewerDateTime(row.scheduledStartAt, practitionerTimeZone, {
                  locale: locale === "ar" ? "ar-SA" : "en-US",
                  fallbackText: "—",
                })}
              </p>
            ) : (
              <p className="text-sm text-text-muted">{t("practitioner.list.table.notScheduled")}</p>
            )}
          </div>
        ),
      },
      {
        id: "durationMinutes",
        header: t("practitioner.list.table.duration"),
        accessor: (row) => row.durationMinutes,
        cell: (row) => (
          <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {t("card.duration", { n: row.durationMinutes })}
          </span>
        ),
        hideBelow: "sm",
      },
      {
        id: "status",
        header: t("practitioner.list.table.status"),
        accessor: (row) => row.status,
        cell: (row) => (
          <SessionStatusBadge
            status={row.status}
            presentationStatus={row.presentationStatus}
          />
        ),
      },
    ],
    [locale, t],
  );

  const emptyStateTitle = hasActiveFilters
    ? t("practitioner.list.filteredEmptyHeading")
    : t("practitioner.list.emptyHeading");
  const emptyStateDescription = hasActiveFilters
    ? t("practitioner.list.filteredEmptyNote")
    : t("practitioner.list.emptyNote");

  return (
    <div className="space-y-4">
      <PractitionerPageHeader
        eyebrow={t("practitioner.meta.listTitle")}
        title={t("practitioner.list.heading")}
        description={t("practitioner.list.note")}
      />

      <PractitionerStatsGrid cols={4}>
        <PractitionerStatCard
          label={t("practitioner.list.summary.total")}
          value={String(pagination?.totalItems ?? 0)}
          hint={t("practitioner.list.summary.totalHint")}
          tone="primary"
          metricKey="sessions.total"
        />
      </PractitionerStatsGrid>

      <PractitionerFilterCard>
        <div className="space-y-2.5">
          <div className="grid gap-2.5 lg:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("practitioner.list.filters.searchLabel")}
              </span>
              <div className="relative">
                <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-text-muted">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </span>
                <input
                  className="app-control w-full px-11 py-2.5"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("practitioner.list.filters.searchPlaceholder")}
                  aria-label={t("practitioner.list.filters.searchLabel")}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("practitioner.list.filters.presentationLabel")}
              </span>
              <select
                className="app-control w-full px-4 py-2.5"
                value={presentationFilter}
                onChange={(event) => {
                  setPresentationFilter(event.target.value as PractitionerPresentationFilter);
                  setPage(1);
                }}
                aria-label={t("practitioner.list.filters.presentationLabel")}
              >
                <option value="all">{t("practitioner.list.filters.presentationAll")}</option>
                {(
                  [
                    ["joinable", t("practitioner.list.filters.presentationJoinable")],
                    ["live", t("practitioner.list.filters.presentationLive")],
                    ["upcoming", t("practitioner.list.filters.presentationUpcoming")],
                    ["finished", t("practitioner.list.filters.presentationFinished")],
                    ["unavailable", t("practitioner.list.filters.presentationUnavailable")],
                  ] as const
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <DateField
              label={t("practitioner.list.filters.fromLabel")}
              value={scheduledFrom}
              onChange={(nextValue) => {
                setScheduledFrom(nextValue);
                setPage(1);
              }}
              placeholder="2026-04-01"
            />

            <DateField
              label={t("practitioner.list.filters.toLabel")}
              value={scheduledTo}
              onChange={(nextValue) => {
                setScheduledTo(nextValue);
                setPage(1);
              }}
              placeholder="2026-04-30"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="space-y-1">
              <p className="text-xs text-text-secondary">{t("practitioner.list.tableNote")}</p>
              {practitionerTimeZoneLabel ? (
                <p className="text-xs text-text-muted">
                  {t("practitioner.list.timezoneNote", {
                    timezone: practitionerTimeZoneLabel,
                  })}
                </p>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              startIcon={<RotateCcw className="h-4 w-4" />}
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              {t("practitioner.list.filters.clear")}
            </Button>
          </div>
        </div>
      </PractitionerFilterCard>

      <PractitionerTableSection
        title={t("practitioner.list.tableTitle")}
        subtitle={t("practitioner.list.tableNote")}
        flushContent
      >
        <DataTable
          data={sessions}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isLoading}
          error={isError ? t("practitioner.list.errorNote") : null}
          errorState={{
            title: t("practitioner.list.errorHeading"),
            description: t("practitioner.list.errorNote"),
            action: {
              label: t("practitioner.list.retry"),
              onClick: () => refetch(),
            },
          }}
          emptyState={{
            title: emptyStateTitle,
            description: emptyStateDescription,
            action: hasActiveFilters
              ? {
                  label: t("practitioner.list.filters.clear"),
                  onClick: clearFilters,
                }
              : undefined,
          }}
          pagination={
            pagination
              ? {
                  page: pagination.page,
                  limit: pagination.limit,
                  totalItems: pagination.totalItems,
                  totalPages: pagination.totalPages,
                }
              : {
                  page,
                  limit,
                  totalItems: 0,
                  totalPages: 1,
                }
          }
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
          rowActionsHeader={t("practitioner.list.table.actions")}
          rowActions={(row) => (
            <ActionIconButton
              intent="view"
              label={t("practitioner.list.table.openDetails")}
              icon={<Eye className="h-4 w-4" />}
              onClick={() => openSession(row.id)}
            />
          )}
          onRowClick={(row) => openSession(row.id)}
          ariaLabel={t("practitioner.list.heading")}
          caption={t("practitioner.list.heading")}
          stickyHeader
          hoverable
          striped
        />
      </PractitionerTableSection>
    </div>
  );
}
