"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import CollapsibleHelpCenter from "@/components/shared/CollapsibleHelpCenter";
import AdminOperationalListShell, {
  AdminSummaryCard,
} from "@/components/shared/admin/AdminOperationalListShell";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import DateTimeField from "@/components/form/input/DateTimeField";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdvancedFiltersToggleButton from "@/components/ui/filters/AdvancedFiltersToggleButton";
import type { ColumnDef } from "@/components/ui/data-table";
import {
  buildUpdatedSearchParams,
  parseEnumParam,
  parsePositiveIntParam,
  parseTextParam,
} from "@/components/ui/data-table";
import { Drawer, ModalBody, ModalHeader } from "@/components/ui/modal";
import { useAdminSessions } from "../hooks/use-admin-sessions";
import type {
  AdminSessionListItem,
  ListAdminSessionsParams,
} from "../types/admin-sessions.types";
import type { SessionStatus } from "@/features/sessions/types/sessions.types";
import {
  useAdminSessionAttendance,
  useAdminSessionRuntimeInspection,
} from "@/features/admin/session-runtime/hooks/use-admin-session-runtime";
import { useQueries } from "@tanstack/react-query";
import { listAdminSessions } from "../api/admin-sessions.api";
import { adminSessionsQueryKeys } from "../constants/query-keys";

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;
const STATUS_FILTERS: Array<SessionStatus | "ALL"> = [
  "ALL",
  "DRAFT",
  "PENDING_PAYMENT",
  "PENDING_PRACTITIONER_RESPONSE",
  "CONFIRMED",
  "UPCOMING",
  "READY_TO_JOIN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
];

const STATUS_TONE: Partial<Record<SessionStatus, string>> = {
  DRAFT: "bg-surface-tertiary text-text-secondary",
  PENDING_PAYMENT:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
  PENDING_PRACTITIONER_RESPONSE:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
  CONFIRMED: "bg-primary-light text-text-brand",
  UPCOMING: "bg-primary-light text-text-brand",
  READY_TO_JOIN:
    "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300",
  IN_PROGRESS:
    "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300",
  COMPLETED: "bg-surface-tertiary text-text-secondary",
  CANCELLED:
    "bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-300",
  NO_SHOW:
    "bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-300",
  EXPIRED:
    "bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-300",
  REFUND_PENDING:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
  REFUNDED: "bg-surface-tertiary text-text-secondary",
};

function formatDateTime(value: string | null, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function toDateTimeLocalValue(value: Date) {
  const shifted = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

export default function AdminSessionsListScreen() {
  const t = useTranslations("admin-sessions");
  const tAdminArea = useTranslations("admin-area");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const status = parseEnumParam<SessionStatus | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const sort = parseEnumParam<"newest" | "oldest">(
    searchParams.get("sort"),
    ["newest", "oldest"],
    "newest",
  );
  const lateOnly = parseBooleanParam(searchParams.get("late")) ?? false;
  const missingAttendanceOnly =
    parseBooleanParam(searchParams.get("missingAttendance")) ?? false;
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const practitionerId = parseTextParam(searchParams.get("practitionerId"), {
    maxLength: 64,
  });
  const sessionCodeQuery = parseTextParam(searchParams.get("query"), {
    maxLength: 32,
  });
  const patientId = parseTextParam(searchParams.get("patientId"), {
    maxLength: 64,
  });
  const scheduledFrom = parseTextParam(searchParams.get("scheduledFrom"), {
    maxLength: 40,
  });
  const scheduledTo = parseTextParam(searchParams.get("scheduledTo"), {
    maxLength: 40,
  });
  const quickPreset = parseEnumParam<"delayed" | "missingAttendance" | "startingSoon" | "ALL">(
    searchParams.get("quick"),
    ["ALL", "delayed", "missingAttendance", "startingSoon"],
    "ALL",
  );
  const hasAdvancedFilters =
    lateOnly ||
    missingAttendanceOnly ||
    Boolean(practitionerId) ||
    Boolean(patientId) ||
    Boolean(scheduledFrom) ||
    Boolean(scheduledTo);
  const hasActiveFilters =
    Boolean(sessionCodeQuery) ||
    sort !== "newest" ||
    status !== "ALL" ||
    hasAdvancedFilters;

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(hasAdvancedFilters);

  const params = useMemo<ListAdminSessionsParams>(() => {
    const next: ListAdminSessionsParams = { page, limit, sort };
    if (sessionCodeQuery) next.query = sessionCodeQuery;
    if (status !== "ALL") next.status = status;
    if (lateOnly) next.late = true;
    if (missingAttendanceOnly) next.missingAttendance = true;
    if (practitionerId) next.practitionerId = practitionerId;
    if (patientId) next.patientId = patientId;
    if (scheduledFrom) next.scheduledFrom = new Date(scheduledFrom).toISOString();
    if (scheduledTo) next.scheduledTo = new Date(scheduledTo).toISOString();
    return next;
  }, [
    lateOnly,
    missingAttendanceOnly,
    page,
    patientId,
    practitionerId,
    scheduledFrom,
    scheduledTo,
    sessionCodeQuery,
    sort,
    status,
    limit,
  ]);

  const sessions = useAdminSessions(params);
  const data = sessions.data;
  const runtime = useAdminSessionRuntimeInspection(selectedSessionId ?? undefined);
  const attendance = useAdminSessionAttendance(selectedSessionId ?? undefined);

  const countBaseParams = useMemo<ListAdminSessionsParams>(() => {
    const base: ListAdminSessionsParams = { page: 1, limit: 1 };
    if (status !== "ALL") base.status = status;
    if (sessionCodeQuery) base.query = sessionCodeQuery;
    if (practitionerId) base.practitionerId = practitionerId;
    if (patientId) base.patientId = patientId;
    return base;
  }, [status, sessionCodeQuery, practitionerId, patientId]);

  const startingSoonWindow = useMemo(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 60 * 60 * 1000);
    return {
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
    };
  }, []);

  const quickCounts = useQueries({
    queries: [
      {
        queryKey: adminSessionsQueryKeys.list({
          ...countBaseParams,
          late: true,
        }),
        queryFn: () =>
          listAdminSessions({
            ...countBaseParams,
            late: true,
          }),
        staleTime: 20_000,
      },
      {
        queryKey: adminSessionsQueryKeys.list({
          ...countBaseParams,
          missingAttendance: true,
        }),
        queryFn: () =>
          listAdminSessions({
            ...countBaseParams,
            missingAttendance: true,
          }),
        staleTime: 20_000,
      },
      {
        queryKey: adminSessionsQueryKeys.list({
          ...countBaseParams,
          scheduledFrom: startingSoonWindow.fromIso,
          scheduledTo: startingSoonWindow.toIso,
        }),
        queryFn: () =>
          listAdminSessions({
            ...countBaseParams,
            scheduledFrom: startingSoonWindow.fromIso,
            scheduledTo: startingSoonWindow.toIso,
          }),
        staleTime: 20_000,
      },
    ],
  });

  const delayedCount = quickCounts[0]?.data?.pagination.totalItems;
  const missingAttendanceCount = quickCounts[1]?.data?.pagination.totalItems;
  const startingSoonCount = quickCounts[2]?.data?.pagination.totalItems;

  const updateListQuery = (
    updates: Record<string, string | number | null | undefined>,
  ) => {
    const next = buildUpdatedSearchParams(
      new URLSearchParams(searchParams.toString()),
      updates,
    );
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const columns = useMemo<ColumnDef<AdminSessionListItem>[]>(
    () => [
      {
        id: "sessionCode",
        header: t("table.headers.sessionCode"),
        accessor: (row) => row.sessionCode,
        cell: (row) => (
          <span className="font-mono text-xs text-text-secondary">{row.sessionCode}</span>
        ),
      },
      {
        id: "status",
        header: t("table.headers.status"),
        accessor: (row) => row.status,
        cell: (row) => (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  STATUS_TONE[row.status] ??
                  "bg-surface-tertiary text-text-secondary"
                }`}
              >
                {tAdminArea(
                  `payments.sessionStatuses.${row.status}` as Parameters<
                    typeof tAdminArea
                  >[0],
                )}
              </span>
              {row.isDelayed ? (
                <span className="rounded-full bg-danger-50 px-2.5 py-1 text-xs font-semibold text-danger-700 dark:bg-danger-500/10 dark:text-danger-300">
                  {t("badges.delayed")}
                </span>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: "scheduledStartAt",
        header: t("table.headers.scheduledStart"),
        accessor: (row) =>
          formatDateTime(row.scheduledStartAt, locale, t("table.fallback.none")),
      },
      {
        id: "practitioner",
        header: t("table.headers.practitioner"),
        accessor: (row) => row.practitioner.displayName ?? row.practitioner.slug,
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary dark:text-white/95">
              {row.practitioner.displayName ?? t("table.fallback.noName")}
            </p>
            <p className="truncate text-xs text-text-muted">{row.practitioner.slug}</p>
          </div>
        ),
      },
      {
        id: "patient",
        header: t("table.headers.patient"),
        accessor: (row) => row.patient?.displayName ?? "",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-text-primary dark:text-white/95">
              {row.patient?.displayName ?? t("table.fallback.noName")}
            </p>
            {row.patient ? (
              <p className="truncate text-xs text-text-muted">{row.patient.id.slice(0, 8)}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "mode",
        header: t("table.headers.mode"),
        accessor: (row) => t(`modes.${row.sessionMode}` as Parameters<typeof t>[0]),
        hideBelow: "xl",
      },
    ],
    [locale, t, tAdminArea],
  );

  const attendanceSummary = attendance.data?.summary;
  const selectedSession = useMemo(
    () => data?.items.find((item) => item.id === selectedSessionId) ?? null,
    [data?.items, selectedSessionId],
  );

  return (
    <AdminOperationalListShell
      title={t("header.title")}
      summaryCards={
        <>
          <AdminSummaryCard
            label={t("header.title")}
            value={typeof data?.pagination.totalItems === "number" ? data.pagination.totalItems : "..."}
            tone="primary"
          />
          <AdminSummaryCard
            label={t("quickActions.delayedNow")}
            value={typeof delayedCount === "number" ? delayedCount : "..."}
            tone="warning"
          />
          <AdminSummaryCard
            label={t("quickActions.missingAttendance")}
            value={typeof missingAttendanceCount === "number" ? missingAttendanceCount : "..."}
            tone="warning"
          />
          <AdminSummaryCard
            label={t("quickActions.startingSoon")}
            value={typeof startingSoonCount === "number" ? startingSoonCount : "..."}
            tone="success"
          />
        </>
      }
      filters={
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.sessionCode")}
            </span>
            <input
              type="text"
              value={sessionCodeQuery}
              onChange={(event) =>
                updateListQuery({
                  query: event.target.value || null,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
              placeholder={t("filters.sessionCodePlaceholder")}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.status")}
            </span>
            <select
              value={status}
              onChange={(event) =>
                updateListQuery({
                  status: event.target.value === "ALL" ? null : event.target.value,
                  page: 1,
                  quick: null,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.allStatuses")}</option>
              {STATUS_FILTERS.filter(
                (value): value is SessionStatus => value !== "ALL",
              ).map((value) => (
                <option key={value} value={value}>
                  {tAdminArea(
                    `payments.sessionStatuses.${value}` as Parameters<
                      typeof tAdminArea
                    >[0],
                  )}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.sort")}
            </span>
            <select
              value={sort}
              onChange={(event) =>
                updateListQuery({
                  sort: event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="newest">{t("filters.sortNewest")}</option>
              <option value="oldest">{t("filters.sortOldest")}</option>
            </select>
          </label>

          <div className="flex flex-wrap items-end justify-end gap-2 md:col-span-2 xl:col-span-2">
            <AdvancedFiltersToggleButton
              expanded={showAdvancedFilters}
              hasHiddenActive={!showAdvancedFilters && hasAdvancedFilters}
              onToggle={() => setShowAdvancedFilters((prev) => !prev)}
            />
            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={() =>
                updateListQuery({
                  query: null,
                  sort: null,
                  status: null,
                  late: null,
                  missingAttendance: null,
                  practitionerId: null,
                  patientId: null,
                  scheduledFrom: null,
                  scheduledTo: null,
                  quick: null,
                  page: 1,
                })
              }
            />
          </div>
        </div>

        {showAdvancedFilters ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.practitionerId")}
              </span>
              <input
                type="text"
                value={practitionerId}
                onChange={(event) =>
                  updateListQuery({
                    practitionerId: event.target.value || null,
                    page: 1,
                    quick: null,
                  })
                }
                className="app-control w-full px-4 py-3"
                placeholder={t("filters.idPlaceholder")}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.patientId")}
              </span>
              <input
                type="text"
                value={patientId}
                onChange={(event) =>
                  updateListQuery({
                    patientId: event.target.value || null,
                    page: 1,
                    quick: null,
                  })
                }
                className="app-control w-full px-4 py-3"
                placeholder={t("filters.idPlaceholder")}
              />
            </label>

            <DateTimeField
              label={t("filters.scheduledFrom")}
              value={scheduledFrom}
              onChange={(value) =>
                updateListQuery({
                  scheduledFrom: value || null,
                  page: 1,
                  quick: null,
                })
              }
            />

            <DateTimeField
              label={t("filters.scheduledTo")}
              value={scheduledTo}
              onChange={(value) =>
                updateListQuery({
                  scheduledTo: value || null,
                  page: 1,
                  quick: null,
                })
              }
            />

            <label className="flex w-full items-center gap-3 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-primary dark:bg-white/5 dark:text-white/90">
              <input
                type="checkbox"
                checked={lateOnly}
                onChange={(event) =>
                  updateListQuery({
                    late: event.target.checked ? "true" : null,
                    page: 1,
                    quick: null,
                  })
                }
                className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              {t("filters.delayedOnly")}
            </label>

            <label className="flex w-full items-center gap-3 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-primary dark:bg-white/5 dark:text-white/90">
              <input
                type="checkbox"
                checked={missingAttendanceOnly}
                onChange={(event) =>
                  updateListQuery({
                    missingAttendance: event.target.checked ? "true" : null,
                    page: 1,
                    quick: null,
                  })
                }
                className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              {t("filters.missingAttendanceOnly")}
            </label>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="me-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t("quickActions.heading")}
          </span>

          <button
            type="button"
            onClick={() =>
              updateListQuery({
                quick: "delayed",
                late: "true",
                missingAttendance: null,
                scheduledFrom: null,
                scheduledTo: null,
                page: 1,
              })
            }
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              quickPreset === "delayed"
                ? "border-danger-300 bg-danger-50 text-danger-700 dark:border-danger-500/40 dark:bg-danger-500/10 dark:text-danger-300"
                : "border-border-light bg-surface-secondary text-text-secondary hover:bg-surface-tertiary dark:bg-white/5"
            }`}
          >
            {t("quickActions.delayedNow")}
            <span className="ms-2 rounded-full bg-white/70 px-1.5 py-0.5 text-[11px] font-bold dark:bg-black/20">
              {typeof delayedCount === "number" ? delayedCount : "..."}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              updateListQuery({
                quick: "missingAttendance",
                missingAttendance: "true",
                late: null,
                page: 1,
              })
            }
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              quickPreset === "missingAttendance"
                ? "border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300"
                : "border-border-light bg-surface-secondary text-text-secondary hover:bg-surface-tertiary dark:bg-white/5"
            }`}
          >
            {t("quickActions.missingAttendance")}
            <span className="ms-2 rounded-full bg-white/70 px-1.5 py-0.5 text-[11px] font-bold dark:bg-black/20">
              {typeof missingAttendanceCount === "number"
                ? missingAttendanceCount
                : "..."}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
              updateListQuery({
                quick: "startingSoon",
                scheduledFrom: toDateTimeLocalValue(now),
                scheduledTo: toDateTimeLocalValue(inOneHour),
                late: null,
                page: 1,
              });
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              quickPreset === "startingSoon"
                ? "border-primary/40 bg-primary-light text-text-brand"
                : "border-border-light bg-surface-secondary text-text-secondary hover:bg-surface-tertiary dark:bg-white/5"
            }`}
          >
            {t("quickActions.startingSoon")}
            <span className="ms-2 rounded-full bg-white/70 px-1.5 py-0.5 text-[11px] font-bold dark:bg-black/20">
              {typeof startingSoonCount === "number" ? startingSoonCount : "..."}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              updateListQuery({
                quick: null,
                sort: null,
                query: null,
                late: null,
                missingAttendance: null,
                scheduledFrom: null,
                scheduledTo: null,
                practitionerId: null,
                patientId: null,
                status: null,
                page: 1,
              })
            }
            className="rounded-full border border-border-light px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-tertiary dark:bg-white/5"
          >
            {t("quickActions.clear")}
          </button>
        </div>
        </>
      }
    >

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={sessions.isLoading}
        error={sessions.isError ? t("states.error.note") : null}
        errorState={{
          title: t("states.error.heading"),
          description: t("states.error.note"),
          action: {
            label: t("states.error.retry"),
            onClick: () => sessions.refetch(),
          },
        }}
        onRowClick={(row) => setSelectedSessionId(row.id)}
        rowActions={(row) => (
          <ActionIconButton
            intent="view"
            label={t("table.openRuntime")}
            icon={<CalendarClock className="h-4 w-4" />}
            onClick={() => router.push(`/admin/sessions/runtime-inspection?sessionId=${row.id}` as never)}
          />
        )}
        pagination={
          data
            ? {
                page: data.pagination.page,
                limit: data.pagination.limit,
                total: data.pagination.totalItems,
                totalPages: data.pagination.totalPages,
                hasPrevPage: data.pagination.page > 1,
                hasNextPage: data.pagination.page < data.pagination.totalPages,
              }
            : undefined
        }
        onPageChange={(nextPage) => updateListQuery({ page: nextPage })}
        onPageSizeChange={(nextLimit) => updateListQuery({ limit: nextLimit, page: 1 })}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        emptyState={{
          icon: <CalendarClock className="h-5 w-5 text-primary" />,
          title: t("states.empty.heading"),
          description: t("states.empty.note"),
        }}
        ariaLabel={t("header.title")}
        caption={t("header.title")}
      />

      <Drawer
        isOpen={Boolean(selectedSessionId)}
        onClose={() => setSelectedSessionId(null)}
        side={locale === "ar" ? "left" : "right"}
      >
        <ModalHeader
          title={t("drawer.title")}
          description={
            selectedSession
              ? t("drawer.description", {
                  code: selectedSession.sessionCode,
                  id: selectedSession.id,
                })
              : undefined
          }
        />
        <ModalBody>
          <div className="space-y-4">
            {runtime.isLoading || attendance.isLoading ? (
              <p className="text-sm text-text-secondary">{t("drawer.loading")}</p>
            ) : runtime.isError || attendance.isError ? (
              <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-300">
                <p>{t("drawer.error")}</p>
              </div>
            ) : runtime.data ? (
              <>
                <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/5">
                  <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("drawer.runtimeHeading")}
                  </h3>
                  <dl className="mt-3 grid gap-2 text-sm text-text-secondary">
                    <div className="flex items-center justify-between gap-4">
                      <dt>{t("drawer.fields.status")}</dt>
                      <dd>
                        {tAdminArea(
                          `payments.sessionStatuses.${runtime.data.item.status}` as Parameters<
                            typeof tAdminArea
                          >[0],
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>{t("drawer.fields.scheduledStart")}</dt>
                      <dd>
                        {formatDateTime(
                          runtime.data.item.scheduledStartAt,
                          locale,
                          t("table.fallback.none"),
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt>{t("drawer.fields.scheduledEnd")}</dt>
                      <dd>
                        {formatDateTime(
                          runtime.data.item.scheduledEndAt,
                          locale,
                          t("table.fallback.none"),
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 dark:bg-white/5">
                  <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                    {t("drawer.attendanceHeading")}
                  </h3>
                  {attendanceSummary ? (
                    <dl className="mt-3 grid gap-2 text-sm text-text-secondary">
                      <div className="flex items-center justify-between gap-4">
                        <dt>{t("drawer.fields.patientJoined")}</dt>
                        <dd>
                          {attendanceSummary.patientHasJoined
                            ? t("drawer.values.yes")
                            : t("drawer.values.no")}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt>{t("drawer.fields.practitionerJoined")}</dt>
                        <dd>
                          {attendanceSummary.practitionerHasJoined
                            ? t("drawer.values.yes")
                            : t("drawer.values.no")}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt>{t("drawer.fields.firstJoinedAt")}</dt>
                        <dd>
                          {formatDateTime(
                            attendanceSummary.firstJoinedAt,
                            locale,
                            t("table.fallback.none"),
                          )}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt>{t("drawer.fields.lastLeftAt")}</dt>
                        <dd>
                          {formatDateTime(
                            attendanceSummary.lastLeftAt,
                            locale,
                            t("table.fallback.none"),
                          )}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-text-secondary">
                      {t("drawer.noAttendance")}
                    </p>
                  )}
                </div>

                {selectedSessionId ? (
                  <Link
                    href={`/admin/sessions/runtime-inspection?sessionId=${selectedSessionId}` as never}
                    className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    {t("drawer.openFullRuntime")}
                  </Link>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-text-secondary">{t("drawer.empty")}</p>
            )}
          </div>
        </ModalBody>
      </Drawer>

      <CollapsibleHelpCenter
        title={t("header.eyebrow")}
        summary={t("header.note")}
        sections={[
          {
            heading: t("scope.heading"),
            items: [
              t("scope.items.statuses"),
              t("scope.items.delayedFilter"),
              t("scope.items.runtimeLink"),
            ],
          },
          {
            heading: t("boundaries.heading"),
            items: [
              t("boundaries.items.visibilityOnly"),
              t("boundaries.items.noAlerts"),
              t("boundaries.items.noRealtime"),
            ],
          },
        ]}
      />
    </AdminOperationalListShell>
  );
}
