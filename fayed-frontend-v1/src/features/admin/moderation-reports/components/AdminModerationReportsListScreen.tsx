"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdvancedFiltersToggleButton from "@/components/ui/filters/AdvancedFiltersToggleButton";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam, parseTextParam } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { ADMIN_MODERATION_STATUS_STYLES } from "../lib/admin-moderation-reports";
import { useAdminModerationReports } from "../hooks/use-admin-moderation-reports";
import type {
  ListModerationReportsParams,
  ModerationCaseStatus,
  ModerationQueueItem,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
  ModerationTargetSnapshot,
} from "../types/admin-moderation-reports.types";

const STATUS_FILTERS: Array<ModerationCaseStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "UNDER_REVIEW",
  "READY_FOR_ENFORCEMENT",
  "RESOLVED",
  "DISMISSED",
];

const TARGET_FILTERS: ModerationReportTargetType[] = [
  "CARE_CHAT_CONVERSATION",
  "CARE_CHAT_MESSAGE",
  "GENERAL_CHAT_CONVERSATION",
  "GENERAL_CHAT_MESSAGE",
  "REVIEW",
  "ARTICLE",
  "SUPPORT_TICKET",
  "SUPPORT_MESSAGE",
];

const REPORTER_FILTERS: ModerationReporterRole[] = [
  "PATIENT",
  "PRACTITIONER",
  "SUPPORT_AGENT",
  "ADMIN",
  "CONTENT_REVIEWER",
];

const REASON_FILTERS: ModerationReportReason[] = [
  "ABUSE",
  "HARASSMENT",
  "SPAM",
  "SCAM",
  "INAPPROPRIATE_CONTENT",
  "PRIVACY_BREACH",
  "OTHER",
];

const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;
const SORTABLE_COLUMNS = ["createdAt", "lastActionAt", "status", "targetType", "reason"] as const;
type SortableModerationColumn = (typeof SORTABLE_COLUMNS)[number];

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function getSnapshotSummary(
  snapshot: ModerationTargetSnapshot | null,
  t: ReturnType<typeof useTranslations>,
) {
  if (!snapshot) {
    return t("list.snapshot.none");
  }

  const count = Object.keys(snapshot.context ?? {}).length;
  const kindLabel = t(`targetTypes.${snapshot.kind}` as Parameters<typeof t>[0]);
  return t("list.snapshot.summary", { kind: kindLabel, count });
}

export default function AdminModerationReportsListScreen() {
  const t = useTranslations("admin-moderation-reports");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusFilter = parseEnumParam<ModerationCaseStatus | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const targetFilter = parseEnumParam<ModerationReportTargetType | "ALL">(
    searchParams.get("targetType"),
    ["ALL", ...TARGET_FILTERS],
    "ALL",
  );
  const reporterFilter = parseEnumParam<ModerationReporterRole | "ALL">(
    searchParams.get("reporterRole"),
    ["ALL", ...REPORTER_FILTERS],
    "ALL",
  );
  const reasonFilter = parseEnumParam<ModerationReportReason | "ALL">(
    searchParams.get("reason"),
    ["ALL", ...REASON_FILTERS],
    "ALL",
  );
  const query = parseTextParam(searchParams.get("q"), { maxLength: 120 });
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const sortColumn = parseEnumParam<SortableModerationColumn>(
    searchParams.get("sortBy"),
    SORTABLE_COLUMNS,
    "createdAt",
  );
  const sortDirection = parseEnumParam<"asc" | "desc">(
    searchParams.get("sortDir"),
    ["asc", "desc"],
    "desc",
  );
  const sortConfig: SortConfig = { column: sortColumn, direction: sortDirection };
  const hasActiveFilters =
    statusFilter !== "ALL" ||
    targetFilter !== "ALL" ||
    reporterFilter !== "ALL" ||
    reasonFilter !== "ALL" ||
    Boolean(query.trim());
  const hasAdvancedFilters =
    targetFilter !== "ALL" || reporterFilter !== "ALL" || reasonFilter !== "ALL";
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(hasAdvancedFilters);

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const params = useMemo<ListModerationReportsParams>(() => {
    const next: ListModerationReportsParams = {
      page,
      limit,
      sortBy: "CREATED_AT",
      sortOrder: sortDirection === "asc" ? "ASC" : "DESC",
    };
    if (statusFilter !== "ALL") next.status = statusFilter;
    if (targetFilter !== "ALL") next.targetType = targetFilter;
    if (reporterFilter !== "ALL") next.reporterRole = reporterFilter;
    if (reasonFilter !== "ALL") next.reason = reasonFilter;
    if (query.trim()) next.query = query.trim();
    return next;
  }, [limit, page, query, reasonFilter, reporterFilter, sortDirection, statusFilter, targetFilter]);

  const reportsQuery = useAdminModerationReports(params);
  const data = reportsQuery.data;

  const columns = useMemo<ColumnDef<ModerationQueueItem>[]>(() => [
    {
      id: "report",
      header: "Report",
      accessor: (row) => row.id,
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary dark:text-white/95">
            {t("list.itemTitle", { id: row.id.slice(0, 8) })}
          </p>
          <p className="mt-1 text-xs text-text-muted">{getSnapshotSummary(row.targetSnapshot, t)}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ADMIN_MODERATION_STATUS_STYLES[row.status]}`}>
          {t(`statuses.${row.status}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      id: "targetType",
      header: "Target",
      accessor: (row) => t(`targetTypes.${row.targetType}` as Parameters<typeof t>[0]),
      sortable: true,
    },
    {
      id: "reason",
      header: "Reason",
      accessor: (row) => t(`reasons.${row.reason}` as Parameters<typeof t>[0]),
      sortable: true,
      hideOnMobile: true,
    },
    {
      id: "reporterRole",
      header: "Reporter",
      accessor: (row) => t(`reporterRoles.${row.reporterRole}` as Parameters<typeof t>[0]),
      hideOnMobile: true,
    },
    {
      id: "createdAt",
      header: "Created",
      accessor: (row) => new Date(row.createdAt).getTime(),
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDateTime(row.createdAt, locale),
    },
    {
      id: "lastActionAt",
      header: "Last action",
      accessor: (row) => (row.lastActionAt ? new Date(row.lastActionAt).getTime() : null),
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDateTime(row.lastActionAt, locale),
    },
  ], [locale, t]);

  return (
    <div className="space-y-6">
      <section className="app-panel rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary dark:text-white/95 sm:text-3xl">
              {t("list.title")}
            </h1>
          </div>
          <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
            {data ? t("list.count", { value: data.pagination.totalItems }) : t("list.countLoading")}
          </span>
        </div>
      </section>

      <section className="app-panel rounded-[28px] p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.allStatuses")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                updateListQuery({
                  status: event.target.value === "ALL" ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.allStatuses")}</option>
              {STATUS_FILTERS.filter((status) => status !== "ALL").map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.query")}
            </span>
            <input
              value={query}
              onChange={(event) =>
                updateListQuery({
                  q: event.target.value || null,
                  page: 1,
                })
              }
              placeholder={t("filters.queryPlaceholder")}
              className="app-control w-full px-4 py-3"
            />
          </label>

          <div className="flex items-end justify-end">
            <AdvancedFiltersToggleButton
              expanded={showAdvancedFilters}
              hasHiddenActive={!showAdvancedFilters && hasAdvancedFilters}
              onToggle={() => setShowAdvancedFilters((prev) => !prev)}
            />
          </div>

          {showAdvancedFilters ? (
            <>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("filters.target")}
                </span>
                <select
                  value={targetFilter}
                  onChange={(event) =>
                    updateListQuery({
                      targetType: event.target.value === "ALL" ? null : event.target.value,
                      page: 1,
                    })
                  }
                  className="app-control w-full px-4 py-3"
                >
                  <option value="ALL">{t("filters.allTargets")}</option>
                  {TARGET_FILTERS.map((target) => (
                    <option key={target} value={target}>
                      {t(`targetTypes.${target}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("filters.reporter")}
                </span>
                <select
                  value={reporterFilter}
                  onChange={(event) =>
                    updateListQuery({
                      reporterRole: event.target.value === "ALL" ? null : event.target.value,
                      page: 1,
                    })
                  }
                  className="app-control w-full px-4 py-3"
                >
                  <option value="ALL">{t("filters.allReporters")}</option>
                  {REPORTER_FILTERS.map((role) => (
                    <option key={role} value={role}>
                      {t(`reporterRoles.${role}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {t("filters.reason")}
                </span>
                <select
                  value={reasonFilter}
                  onChange={(event) =>
                    updateListQuery({
                      reason: event.target.value === "ALL" ? null : event.target.value,
                      page: 1,
                    })
                  }
                  className="app-control w-full px-4 py-3"
                >
                  <option value="ALL">{t("filters.allReasons")}</option>
                  {REASON_FILTERS.map((reason) => (
                    <option key={reason} value={reason}>
                      {t(`reasons.${reason}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <div className="lg:col-span-4 flex justify-end">
            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={() =>
                updateListQuery({
                  status: null,
                  targetType: null,
                  reporterRole: null,
                  reason: null,
                  q: null,
                  page: 1,
                })
              }
            />
          </div>
        </div>
      </section>

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={reportsQuery.isLoading}
        error={reportsQuery.isError ? t("states.listError.note") : null}
        errorState={{
          title: t("states.listError.heading"),
          description: t("states.listError.note"),
          action: {
            label: t("states.listError.retry"),
            onClick: () => reportsQuery.refetch(),
          },
        }}
        emptyState={{
          icon: <ShieldAlert className="h-5 w-5 text-primary" />,
          title: t("states.empty.heading"),
          description: t("states.empty.note"),
        }}
        sortConfig={sortConfig}
        onSortChange={(nextSort) =>
          updateListQuery({
            sortBy: nextSort.column,
            sortDir: nextSort.direction,
          })
        }
        rowActions={(row) => (
          <ActionIconButton
            intent="view"
            label={t("list.openAction")}
            icon={<ShieldAlert className="h-4 w-4" />}
            onClick={() => router.push(`/admin/moderation/reports/${row.id}` as never)}
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
        ariaLabel={t("list.title")}
        caption={t("list.title")}
      />
    </div>
  );
}
