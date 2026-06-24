"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FileSearch } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { formatAdminNotificationDateTime } from "@/features/admin/notifications/components/admin-notification-utils";
import { useAdminAuditEvents } from "../hooks/use-admin-audit";
import type {
  AdminAuditActorRole,
  AdminAuditCategory,
  AdminAuditListItem,
  AdminAuditSeverity,
  AdminAuditSource,
  ListAdminAuditEventsParams,
} from "../types/admin-audit.types";

const ACTOR_ROLE_FILTERS: AdminAuditActorRole[] = [
  "PATIENT",
  "PRACTITIONER",
  "ADMIN",
  "SUPPORT",
  "CONTENT_REVIEWER",
  "SUPER_ADMIN",
];

const CATEGORY_FILTERS: AdminAuditCategory[] = [
  "SECURITY",
  "SESSION",
  "PAYMENT",
  "CONTENT",
  "SUPPORT",
  "CHAT",
  "SYSTEM",
  "TRAINING",
  "MARKETING",
];

const SEVERITY_FILTERS: AdminAuditSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const SOURCE_FILTERS: AdminAuditSource[] = ["SYSTEM", "EMAIL", "SMS", "PUSH", "IN_APP"];
const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;
const SORTABLE_COLUMNS = ["occurredAt", "action", "category", "severity"] as const;
type SortableAuditColumn = (typeof SORTABLE_COLUMNS)[number];
type AuditTrackingPreset =
  | "ALL"
  | "SECURITY"
  | "FINANCIAL"
  | "SESSIONS"
  | "SUPPORT"
  | "TRAINING"
  | "ADMIN_ACTIONS"
  | "SYSTEM";

type TrackingPresetConfig = {
  id: AuditTrackingPreset;
  labelEn: string;
  labelAr: string;
  filters: {
    eventFamily?: string | null;
    category?: AdminAuditCategory | null;
  };
};

const TRACKING_PRESETS: TrackingPresetConfig[] = [
  {
    id: "ALL",
    labelEn: "All",
    labelAr: "الكل",
    filters: {
      eventFamily: null,
      category: null,
    },
  },
  {
    id: "SECURITY",
    labelEn: "Security",
    labelAr: "الأمان والحسابات",
    filters: {
      eventFamily: "auth",
      category: "SECURITY",
    },
  },
  {
    id: "FINANCIAL",
    labelEn: "Financial",
    labelAr: "المعاملات المالية",
    filters: {
      eventFamily: "payments",
      category: "PAYMENT",
    },
  },
  {
    id: "SESSIONS",
    labelEn: "Sessions",
    labelAr: "الجلسات العلاجية",
    filters: {
      eventFamily: "sessions",
      category: "SESSION",
    },
  },
  {
    id: "SUPPORT",
    labelEn: "Support",
    labelAr: "الدعم والمساعدة",
    filters: {
      category: "SUPPORT",
    },
  },
  {
    id: "TRAINING",
    labelEn: "Training",
    labelAr: "التدريب والأكاديمية",
    filters: {
      eventFamily: "training",
      category: "TRAINING",
    },
  },
  {
    id: "ADMIN_ACTIONS",
    labelEn: "Admin actions",
    labelAr: "عمليات الإشراف",
    filters: {
      eventFamily: "admin",
    },
  },
  {
    id: "SYSTEM",
    labelEn: "System",
    labelAr: "عمليات النظام الآلية",
    filters: {
      category: "SYSTEM",
    },
  },
];

function getSeverityTone(severity: AdminAuditSeverity) {
  if (severity === "CRITICAL") return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200";
  if (severity === "HIGH") return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200";
  if (severity === "MEDIUM") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
}

export default function AdminAuditLogListScreen() {
  const t = useTranslations("admin-audit");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const actorRoleFilter = parseEnumParam<AdminAuditActorRole | "ALL">(
    searchParams.get("actorRole"),
    ["ALL", ...ACTOR_ROLE_FILTERS],
    "ALL",
  );
  const categoryFilter = parseEnumParam<AdminAuditCategory | "ALL">(
    searchParams.get("category"),
    ["ALL", ...CATEGORY_FILTERS],
    "ALL",
  );
  const severityFilter = parseEnumParam<AdminAuditSeverity | "ALL">(
    searchParams.get("severity"),
    ["ALL", ...SEVERITY_FILTERS],
    "ALL",
  );
  const sourceFilter = parseEnumParam<AdminAuditSource | "ALL">(
    searchParams.get("source"),
    ["ALL", ...SOURCE_FILTERS],
    "ALL",
  );
  const trackingPreset = parseEnumParam<AuditTrackingPreset>(
    searchParams.get("tracking"),
    TRACKING_PRESETS.map((preset) => preset.id),
    "ALL",
  );
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const sortColumn = parseEnumParam<SortableAuditColumn>(
    searchParams.get("sortBy"),
    SORTABLE_COLUMNS,
    "occurredAt",
  );
  const sortDirection = parseEnumParam<"asc" | "desc">(
    searchParams.get("sortDir"),
    ["asc", "desc"],
    "desc",
  );
  const sortConfig: SortConfig = { column: sortColumn, direction: sortDirection };

  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const eventFamily = (searchParams.get("eventFamily") ?? "").trim();
  const targetEntityType = (searchParams.get("targetEntityType") ?? "").trim();
  const search = (searchParams.get("search") ?? "").trim();

  const hasActiveFilters =
    actorRoleFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    severityFilter !== "ALL" ||
    sourceFilter !== "ALL" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(eventFamily) ||
    Boolean(targetEntityType) ||
    Boolean(search);

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const applyTrackingPreset = (presetId: AuditTrackingPreset) => {
    const preset = TRACKING_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    updateListQuery({
      tracking: preset.id === "ALL" ? null : preset.id,
      eventFamily: preset.filters.eventFamily ?? null,
      category: preset.filters.category ?? null,
      page: 1,
    });
  };

  const getTrackingPresetLabel = (preset: TrackingPresetConfig) =>
    locale.startsWith("ar") ? preset.labelAr : preset.labelEn;

  const params = useMemo<ListAdminAuditEventsParams>(() => {
    const next: ListAdminAuditEventsParams = {
      page,
      limit,
    };
    if (actorRoleFilter !== "ALL") next.actorRole = actorRoleFilter;
    if (categoryFilter !== "ALL") next.category = categoryFilter;
    if (severityFilter !== "ALL") next.severity = severityFilter;
    if (sourceFilter !== "ALL") next.source = sourceFilter;
    if (dateFrom) next.dateFrom = dateFrom;
    if (dateTo) next.dateTo = dateTo;
    if (eventFamily) next.eventFamily = eventFamily;
    if (targetEntityType) next.targetEntityType = targetEntityType;
    if (search) next.search = search;
    return next;
  }, [
    actorRoleFilter,
    categoryFilter,
    severityFilter,
    sourceFilter,
    dateFrom,
    dateTo,
    eventFamily,
    targetEntityType,
    search,
    page,
    limit,
  ]);

  const audit = useAdminAuditEvents(params);
  const data = audit.data;

  const columns = useMemo<ColumnDef<AdminAuditListItem>[]>(
    () => [
      {
        id: "action",
        header: t("audit.list.columns.action"),
        accessor: (row) => row.action,
        sortable: true,
        cell: (row) => {
          const actionKey = `actions.${row.action}` as Parameters<typeof t>[0];
          const hasActionTranslation = t.has(actionKey);
          const translatedAction = hasActionTranslation ? t(actionKey) : row.action;

          return (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                {translatedAction}
              </p>
              {hasActionTranslation && (
                <p className="mt-0.5 text-[10px] font-mono text-text-muted">{row.action}</p>
              )}
              <p className="mt-1 text-xs text-text-muted">{row.eventFamily}</p>
            </div>
          );
        },
      },
      {
        id: "actor",
        header: t("audit.list.columns.actor"),
        accessor: (row) => row.actor.displayName ?? row.actor.userId,
        cell: (row) => {
          const roleKey = `roles.${row.actor.role}` as Parameters<typeof t>[0];
          const translatedRole = t.has(roleKey) ? t(roleKey) : row.actor.role;

          return (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                {row.actor.displayName ?? t("audit.fallback.noValue")}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {translatedRole ?? t("audit.fallback.noValue")}
              </p>
            </div>
          );
        },
      },
      {
        id: "target",
        header: t("audit.list.columns.target"),
        accessor: (row) => row.target.entityType ?? "",
        cell: (row) => {
          const targetKey = `categories.${row.target.entityType}` as Parameters<typeof t>[0];
          const translatedTarget = t.has(targetKey) ? t(targetKey) : row.target.entityType;
          return (
            <div className="min-w-0">
              <p className="truncate text-sm text-text-primary dark:text-white/95 font-medium">
                {translatedTarget ?? t("audit.fallback.noValue")}
              </p>
            </div>
          );
        },
      },
      {
        id: "category",
        header: t("audit.list.columns.category"),
        accessor: (row) => row.category,
        sortable: true,
        cell: (row) => {
          const catKey = `categories.${row.category}` as Parameters<typeof t>[0];
          return t.has(catKey) ? t(catKey) : row.category;
        }
      },
      {
        id: "severity",
        header: t("audit.list.columns.severity"),
        accessor: (row) => row.severity,
        sortable: true,
        cell: (row) => {
          const sevKey = `severities.${row.severity}` as Parameters<typeof t>[0];
          const translatedSeverity = t.has(sevKey) ? t(sevKey) : row.severity;
          return (
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSeverityTone(row.severity)}`}>
              {translatedSeverity}
            </span>
          );
        },
      },
      {
        id: "source",
        header: t("audit.list.columns.source"),
        accessor: (row) => row.source,
        cell: (row) => {
          const srcKey = `sources.${row.source}` as Parameters<typeof t>[0];
          return t.has(srcKey) ? t(srcKey) : row.source;
        }
      },
      {
        id: "occurredAt",
        header: t("audit.list.columns.occurredAt"),
        accessor: (row) => formatAdminNotificationDateTime(row.occurredAt, locale),
        sortable: true,
      },
    ],
    [locale, t],
  );

  return (
    <AdminOperationalListShell
      title={t("audit.list.title")}
      description={t("audit.list.description")}
      summaryCards={
        <AdminSummaryCard
          label={t("audit.list.summaryLabel")}
          value={typeof data?.pagination.totalItems === "number" ? data.pagination.totalItems : "..."}
          tone="primary"
        />
      }
      filters={
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("audit.list.quickTracking")}
            </p>
            <div className="flex flex-wrap gap-2">
              {TRACKING_PRESETS.map((preset) => {
                const isActive = trackingPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyTrackingPreset(preset.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-primary/70 bg-primary/10 text-primary"
                        : "border-border bg-background text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {getTrackingPresetLabel(preset)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("audit.filters.actorRole")}
            </span>
            <select
              value={actorRoleFilter}
              onChange={(event) =>
                updateListQuery({
                  tracking: null,
                  actorRole: event.target.value === "ALL" ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("audit.filters.all")}</option>
              {ACTOR_ROLE_FILTERS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("audit.filters.category")}
            </span>
            <select
              value={categoryFilter}
              onChange={(event) =>
                updateListQuery({
                  tracking: null,
                  category: event.target.value === "ALL" ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("audit.filters.all")}</option>
              {CATEGORY_FILTERS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("audit.filters.severity")}
            </span>
            <select
              value={severityFilter}
              onChange={(event) =>
                updateListQuery({
                  tracking: null,
                  severity: event.target.value === "ALL" ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("audit.filters.all")}</option>
              {SEVERITY_FILTERS.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("audit.filters.source")}
            </span>
            <select
              value={sourceFilter}
              onChange={(event) =>
                updateListQuery({
                  tracking: null,
                  source: event.target.value === "ALL" ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("audit.filters.all")}</option>
              {SOURCE_FILTERS.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("audit.filters.dateFrom")}
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => updateListQuery({ tracking: null, dateFrom: event.target.value || null, page: 1 })}
              className="app-control w-full px-4 py-3"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("audit.filters.dateTo")}
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => updateListQuery({ tracking: null, dateTo: event.target.value || null, page: 1 })}
              className="app-control w-full px-4 py-3"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("audit.filters.eventFamily")}
            </span>
            <input
              type="text"
              value={eventFamily}
              onChange={(event) =>
                updateListQuery({ tracking: null, eventFamily: event.target.value || null, page: 1 })
              }
              placeholder={t("audit.filters.eventFamilyPlaceholder")}
              className="app-control w-full px-4 py-3"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("audit.filters.targetEntityType")}
            </span>
            <input
              type="text"
              value={targetEntityType}
              onChange={(event) =>
                updateListQuery({
                  tracking: null,
                  targetEntityType: event.target.value || null,
                  page: 1,
                })
              }
              placeholder={t("audit.filters.targetEntityTypePlaceholder")}
              className="app-control w-full px-4 py-3"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("audit.filters.search")}
            </span>
            <input
              type="text"
              value={search}
              onChange={(event) => updateListQuery({ tracking: null, search: event.target.value || null, page: 1 })}
              placeholder={t("audit.filters.searchPlaceholder")}
              className="app-control w-full px-4 py-3"
            />
          </label>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={() =>
                updateListQuery({
                  tracking: null,
                  actorRole: null,
                  category: null,
                  severity: null,
                  source: null,
                  dateFrom: null,
                  dateTo: null,
                  eventFamily: null,
                  targetEntityType: null,
                  search: null,
                  page: 1,
                })
              }
            />
          </div>
        </div>
        </div>
      }
    >
      <DataTable
        data={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={audit.isLoading}
        error={audit.isError ? t("audit.states.listError.note") : null}
        errorState={{
          title: t("audit.states.listError.heading"),
          description: t("audit.states.listError.note"),
          action: {
            label: t("audit.states.listError.retry"),
            onClick: () => audit.refetch(),
          },
        }}
        sortConfig={sortConfig}
        onSortChange={(nextSort) => updateListQuery({ sortBy: nextSort.column, sortDir: nextSort.direction })}
        onRowClick={(row) => router.push(`/admin/audit/${row.id}` as never)}
        rowActions={(row) => (
          <ActionIconButton
            intent="view"
            label={t("audit.list.openAction")}
            icon={<FileSearch className="h-4 w-4" />}
            onClick={() => router.push(`/admin/audit/${row.id}` as never)}
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
          icon: <FileSearch className="h-5 w-5 text-primary" />,
          title: t("audit.states.empty.heading"),
          description: t("audit.states.empty.note"),
        }}
        ariaLabel={t("audit.list.title")}
        caption={t("audit.list.title")}
      />
    </AdminOperationalListShell>
  );
}
