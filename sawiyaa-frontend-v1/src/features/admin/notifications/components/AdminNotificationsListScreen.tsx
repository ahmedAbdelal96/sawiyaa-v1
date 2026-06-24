"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { BellRing } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import Select from "@/components/form/Select";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAdminNotifications, useAdminNotificationDetails } from "../hooks/use-admin-notifications";
import { formatAdminNotificationDateTime } from "./admin-notification-utils";
import { getNotificationVisualProps, mapNotificationErrorCode } from "../lib/notification-mappers";
import { Drawer } from "@/components/ui/modal";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import AdminNotificationDetailsPanel from "./AdminNotificationDetailsPanel";
import type {
  AdminNotificationCategory,
  AdminNotificationChannel,
  AdminNotificationListItem,
  AdminNotificationStatus,
  ListAdminNotificationsParams,
} from "../types/admin-notifications.types";

const STATUS_FILTERS: Array<AdminNotificationStatus | "DEFAULT" | "ALL"> = [
  "DEFAULT",
  "PENDING",
  "QUEUED",
  "FAILED",
  "SUPPRESSED",
  "SENT",
  "DELIVERED",
  "READ",
  "CANCELLED",
];

const CHANNEL_FILTERS: AdminNotificationChannel[] = ["EMAIL", "SMS", "PUSH", "IN_APP"];
const CATEGORY_FILTERS: AdminNotificationCategory[] = [
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
const PAGE_SIZE_OPTIONS = DEFAULT_PAGE_SIZE_OPTIONS;
const SORTABLE_COLUMNS = ["status", "channel", "attempts", "schedule"] as const;
type SortableNotificationsColumn = (typeof SORTABLE_COLUMNS)[number];

const TONE_CLASSES: Record<string, string> = {
  message: "border border-primary/20 bg-primary-light text-text-brand",
  session: "border border-primary/20 bg-primary-light text-text-brand",
  support: "border border-primary/20 bg-primary-light text-text-brand",
  payment: "border border-primary/20 bg-primary-light text-text-brand",
  system: "border border-border-light bg-surface-tertiary text-text-secondary",
  warning: "border border-status-warning-border bg-status-warning-soft text-status-warning",
  content: "border border-status-danger-border bg-status-danger-soft text-status-danger",
};

function maskUserId(userId: string, locale: string): string {
  const lastFour = userId.slice(-4);
  return locale === "ar" ? `مستخدم ...${lastFour}` : `User ...${lastFour}`;
}

export default function AdminNotificationsListScreen() {
  const t = useTranslations("admin-notifications");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for active Drawer detail view
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statusFilter = parseEnumParam<AdminNotificationStatus | "DEFAULT" | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS,
    "DEFAULT",
  );
  const channelFilter = parseEnumParam<AdminNotificationChannel | "ALL">(
    searchParams.get("channel"),
    ["ALL", ...CHANNEL_FILTERS],
    "ALL",
  );
  const categoryFilter = parseEnumParam<AdminNotificationCategory | "ALL">(
    searchParams.get("category"),
    ["ALL", ...CATEGORY_FILTERS],
    "ALL",
  );
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 50,
  });
  const sortColumn = parseEnumParam<SortableNotificationsColumn>(
    searchParams.get("sortBy"),
    SORTABLE_COLUMNS,
    "schedule",
  );
  const sortDirection = parseEnumParam<"asc" | "desc">(
    searchParams.get("sortDir"),
    ["asc", "desc"],
    "desc",
  );
  const sortConfig: SortConfig = { column: sortColumn, direction: sortDirection };
  const hasActiveFilters =
    statusFilter !== "DEFAULT" || channelFilter !== "ALL" || categoryFilter !== "ALL";

  const statusFilterOptions = useMemo(() => {
    return STATUS_FILTERS.map((status) => ({
      value: status,
      label: status === "DEFAULT"
        ? t("notifications.filters.defaultOperational")
        : status === "ALL"
          ? t("notifications.filters.allStatuses")
          : t(`notifications.statuses.${status}` as Parameters<typeof t>[0])
    }));
  }, [t]);

  const channelFilterOptions = useMemo(() => [
    { value: "ALL", label: t("notifications.filters.allChannels") },
    ...CHANNEL_FILTERS.map((channel) => ({
      value: channel,
      label: t(`notifications.channels.${channel}` as Parameters<typeof t>[0])
    }))
  ], [t]);

  const categoryFilterOptions = useMemo(() => [
    { value: "ALL", label: t("notifications.filters.allCategories") },
    ...CATEGORY_FILTERS.map((category) => ({
      value: category,
      label: t(`notifications.categories.${category}` as Parameters<typeof t>[0])
    }))
  ], [t]);

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const params = useMemo<ListAdminNotificationsParams>(() => {
    const next: ListAdminNotificationsParams = { page, limit };
    if (statusFilter !== "ALL" && statusFilter !== "DEFAULT") next.status = statusFilter;
    if (channelFilter !== "ALL") next.channel = channelFilter;
    if (categoryFilter !== "ALL") next.category = categoryFilter;
    return next;
  }, [statusFilter, channelFilter, categoryFilter, page, limit]);

  // Main notifications list query
  const notifications = useAdminNotifications(params);
  const data = notifications.data;

  // Drawer single item details query
  const details = useAdminNotificationDetails(selectedId || undefined);
  const detailItem = details.data?.item;

  // Parallel global baseline queries for totals
  const totalQuery = useAdminNotifications({ limit: 1 });
  const failedQuery = useAdminNotifications({ limit: 1, status: "FAILED" });
  const pushFailedQuery = useAdminNotifications({ limit: 1, status: "FAILED", channel: "PUSH" });
  const emailFailedQuery = useAdminNotifications({ limit: 1, status: "FAILED", channel: "EMAIL" });
  const completedQuery = useAdminNotifications({ limit: 1, status: "DELIVERED" });
  const pendingQuery = useAdminNotifications({ limit: 1, status: "PENDING" });

  const columns = useMemo<ColumnDef<AdminNotificationListItem>[]>(() => [
    {
      id: "notification",
      header: t("notifications.fields.notificationHeader"),
      accessor: (row) => row.typeSlug,
      cell: (row) => {
        const visual = getNotificationVisualProps(
          row.typeSlug,
          row.category,
          t,
          "admin",
          locale,
          row.context,
          row.primaryAction,
        );
        const toneClass = TONE_CLASSES[visual.tone] || TONE_CLASSES.system;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${toneClass}`}>
              {visual.icon}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {visual.title}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {visual.contextLine || visual.subtitle}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      header: t("notifications.fields.statusHeader"),
      accessor: (row) => row.status,
      sortable: true,
      cell: (row) => {
        let statusStyle = "";
        switch (row.status) {
          case "PENDING":
            statusStyle = "border border-status-warning-border bg-status-warning-soft text-status-warning";
            break;
          case "FAILED":
            statusStyle = "border border-status-danger-border bg-status-danger-soft text-status-danger";
            break;
          case "QUEUED":
            statusStyle = "border border-status-info-border bg-status-info-soft text-status-info";
            break;
          case "SENT":
          case "DELIVERED":
          case "READ":
            statusStyle = "border border-status-success-border bg-status-success-soft text-status-success";
            break;
          default:
            statusStyle = "border border-border-light bg-surface-tertiary text-text-secondary";
            break;
        }
        return (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle}`}>
            {t(`notifications.statuses.${row.status}` as Parameters<typeof t>[0])}
          </span>
        );
      },
    },
    {
      id: "channel",
      header: t("notifications.fields.channelHeader"),
      accessor: (row) => t(`notifications.channels.${row.channel}` as Parameters<typeof t>[0]),
      sortable: true,
    },
    {
      id: "category",
      header: t("notifications.fields.categoryHeader"),
      accessor: (row) => t(`notifications.categories.${row.category}` as Parameters<typeof t>[0]),
      hideOnMobile: true,
    },
    {
      id: "user",
      header: t("notifications.fields.recipientHeader"),
      accessor: (row) => row.userId,
      cell: (row) => (
        <span className="text-xs text-text-secondary font-semibold">
          {row.context?.recipientName 
            ? `${row.context.recipientName} (${row.context.recipientRole || "USER"})`
            : maskUserId(row.userId, locale)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      id: "attempts",
      header: t("notifications.fields.attemptsHeader"),
      accessor: (row) => String(row.attemptsCount),
      align: "center",
      sortable: true,
    },
    {
      id: "schedule",
      header: t("notifications.fields.dateHeader"),
      accessor: (row) =>
        row.scheduledFor
          ? formatAdminNotificationDateTime(row.scheduledFor, locale)
          : formatAdminNotificationDateTime(row.updatedAt, locale),
      hideOnMobile: true,
      sortable: true,
    },
    {
      id: "summary",
      header: t("notifications.fields.summaryHeader"),
      accessor: (row) => row.suppressedReason ?? row.latestAttemptErrorCode ?? t("notifications.list.openDetail"),
      cell: (row) => {
        const rawCode = row.suppressedReason || row.latestAttemptErrorCode;
        if (rawCode) {
          const friendly = mapNotificationErrorCode(rawCode, t);
          return (
            <p className="max-w-md text-xs leading-5 text-status-danger font-semibold">
              {friendly || t("notifications.errors.fallback")}
            </p>
          );
        }
        return (
          <p className="max-w-md text-xs leading-5 text-text-muted">
            {t("notifications.list.openDetail")}
          </p>
        );
      },
    },
  ], [locale, t]);

  return (
    <>
      <AdminOperationalListShell
        title={t("notifications.list.title")}
        summaryCards={
          <>
            <AdminSummaryCard
              label={t("notifications.listSummary.total")}
              value={typeof totalQuery.data?.pagination.totalItems === "number" ? totalQuery.data.pagination.totalItems : "..."}
              tone="primary"
            />
            <AdminSummaryCard
              label={t("notifications.listSummary.failed")}
              value={typeof failedQuery.data?.pagination.totalItems === "number" ? failedQuery.data.pagination.totalItems : "..."}
              tone="danger"
            />
            <AdminSummaryCard
              label={t("notifications.listSummary.pushFailed")}
              value={typeof pushFailedQuery.data?.pagination.totalItems === "number" ? pushFailedQuery.data.pagination.totalItems : "..."}
              tone="warning"
            />
            <AdminSummaryCard
              label={t("notifications.listSummary.emailFailed")}
              value={typeof emailFailedQuery.data?.pagination.totalItems === "number" ? emailFailedQuery.data.pagination.totalItems : "..."}
              tone="warning"
            />
            <AdminSummaryCard
              label={t("notifications.listSummary.sent")}
              value={typeof completedQuery.data?.pagination.totalItems === "number" ? completedQuery.data.pagination.totalItems : "..."}
              tone="success"
            />
            <AdminSummaryCard
              label={t("notifications.listSummary.pending")}
              value={typeof pendingQuery.data?.pagination.totalItems === "number" ? pendingQuery.data.pagination.totalItems : "..."}
              tone="info"
            />
          </>
        }
        filters={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("notifications.filters.allStatuses")}
              </span>
              <Select
                key={`statusFilter-${statusFilter}`}
                defaultValue={statusFilter}
                onChange={(value) =>
                  updateListQuery({
                    status: value === "DEFAULT" ? null : value,
                    page: 1,
                  })
                }
                options={statusFilterOptions}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("notifications.filters.channel")}
              </span>
              <Select
                key={`channelFilter-${channelFilter}`}
                defaultValue={channelFilter}
                onChange={(value) =>
                  updateListQuery({
                    channel: value === "ALL" ? null : value,
                    page: 1,
                  })
                }
                options={channelFilterOptions}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                {t("notifications.filters.category")}
              </span>
              <Select
                key={`categoryFilter-${categoryFilter}`}
                defaultValue={categoryFilter}
                onChange={(value) =>
                  updateListQuery({
                    category: value === "ALL" ? null : value,
                    page: 1,
                  })
                }
                options={categoryFilterOptions}
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <FilterClearButton
                disabled={!hasActiveFilters}
                onClick={() =>
                  updateListQuery({
                    status: null,
                    channel: null,
                    category: null,
                    page: 1,
                  })
                }
              />
            </div>
          </div>
        }
      >
        <DataTable
          data={data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={notifications.isLoading}
          error={notifications.isError ? t("notifications.states.listError.note") : null}
          errorState={{
            title: t("notifications.states.listError.heading"),
            description: t("notifications.states.listError.note"),
            action: {
              label: t("notifications.states.listError.retry"),
              onClick: () => notifications.refetch(),
            },
          }}
          sortConfig={sortConfig}
          onSortChange={(nextSort) =>
            updateListQuery({
              sortBy: nextSort.column,
              sortDir: nextSort.direction,
            })
          }
          onRowClick={(row) => setSelectedId(row.id)}
          rowActions={(row) => (
            <ActionIconButton
              intent="view"
              label={t("notifications.list.openAction")}
              icon={<BellRing className="h-4 w-4" />}
              onClick={() => setSelectedId(row.id)}
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
            icon: <BellRing className="h-5 w-5 text-primary" />,
            title: t("notifications.states.empty.heading"),
            description: t("notifications.states.empty.note"),
          }}
          ariaLabel={t("notifications.list.title")}
          caption={t("notifications.list.title")}
        />
      </AdminOperationalListShell>

      {/* Side drawer detail visibility panel */}
      <Drawer
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
        ariaLabel={t("notifications.detail.title")}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-border-light bg-surface-secondary px-6 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t("notifications.detail.eyebrow")}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-text-primary">
                {t("notifications.detail.title")}
              </h2>
            </div>
          </div>
          {/* Panel content scrollable area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-7 sm:py-6 bg-surface-secondary">
            {details.isLoading && <ListStateSkeleton items={3} heightClass="h-24" />}
            {details.isError && (
              <StateCard
                title={t("notifications.states.detailError.heading")}
                note={t("notifications.states.detailError.note")}
                action={{
                  label: t("notifications.states.detailError.retry"),
                  onClick: () => details.refetch(),
                }}
              />
            )}
            {!details.isLoading && !details.isError && detailItem && (
              <AdminNotificationDetailsPanel item={detailItem} isDrawer={true} />
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
}
