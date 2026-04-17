"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { BellRing } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAdminNotifications } from "../hooks/use-admin-notifications";
import { getAdminNotificationStatusTone } from "../lib/admin-notification-status";
import { formatAdminNotificationDateTime } from "./admin-notification-utils";
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

export default function AdminNotificationsListScreen() {
  const t = useTranslations("admin-notifications");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const notifications = useAdminNotifications(params);
  const data = notifications.data;

  const columns = useMemo<ColumnDef<AdminNotificationListItem>[]>(() => [
    {
      id: "notification",
      header: "Notification",
      accessor: (row) => row.typeSlug,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
            {t("notifications.list.itemTitle", { slug: row.typeSlug })}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {row.relatedEntityType ?? "-"}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      cell: (row) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getAdminNotificationStatusTone(row.status)}`}>
          {t(`notifications.statuses.${row.status}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      id: "channel",
      header: "Channel",
      accessor: (row) => t(`notifications.channels.${row.channel}` as Parameters<typeof t>[0]),
      sortable: true,
    },
    {
      id: "category",
      header: "Category",
      accessor: (row) => t(`notifications.categories.${row.category}` as Parameters<typeof t>[0]),
      hideOnMobile: true,
    },
    {
      id: "user",
      header: "User",
      accessor: (row) => row.userId,
      cell: (row) => <span className="font-mono text-xs text-text-secondary">{row.userId.slice(0, 8)}</span>,
      hideOnMobile: true,
    },
    {
      id: "attempts",
      header: "Attempts",
      accessor: (row) => String(row.attemptsCount),
      align: "center",
      sortable: true,
    },
    {
      id: "schedule",
      header: "Scheduled / Updated",
      accessor: (row) =>
        row.scheduledFor
          ? formatAdminNotificationDateTime(row.scheduledFor, locale)
          : formatAdminNotificationDateTime(row.updatedAt, locale),
      hideOnMobile: true,
      sortable: true,
    },
    {
      id: "summary",
      header: "Summary",
      accessor: (row) => row.suppressedReason ?? row.latestAttemptErrorCode ?? t("notifications.list.openDetail"),
      cell: (row) => {
        const text = row.suppressedReason
          ? t("notifications.list.suppressedReason", { reason: row.suppressedReason })
          : row.latestAttemptErrorCode
            ? t("notifications.list.latestError", { code: row.latestAttemptErrorCode })
            : t("notifications.list.openDetail");
        return <p className="max-w-md text-xs leading-5 text-text-secondary">{text}</p>;
      },
    },
  ], [locale, t]);

  return (
    <AdminOperationalListShell
      title={t("notifications.list.title")}
      summaryCards={
        <AdminSummaryCard
          label={t("notifications.list.title")}
          value={typeof data?.pagination.totalItems === "number" ? data.pagination.totalItems : "..."}
          tone="primary"
        />
      }
      filters={
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("notifications.filters.allStatuses")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                updateListQuery({
                  status: event.target.value === "DEFAULT" ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "DEFAULT"
                    ? t("notifications.filters.defaultOperational")
                    : status === "ALL"
                      ? t("notifications.filters.allStatuses")
                      : t(`notifications.statuses.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("notifications.filters.channel")}
            </span>
            <select
              value={channelFilter}
              onChange={(event) =>
                updateListQuery({
                  channel: event.target.value === "ALL" ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("notifications.filters.allChannels")}</option>
              {CHANNEL_FILTERS.map((channel) => (
                <option key={channel} value={channel}>
                  {t(`notifications.channels.${channel}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("notifications.filters.category")}
            </span>
            <select
              value={categoryFilter}
              onChange={(event) =>
                updateListQuery({
                  category: event.target.value === "ALL" ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("notifications.filters.allCategories")}</option>
              {CATEGORY_FILTERS.map((category) => (
                <option key={category} value={category}>
                  {t(`notifications.categories.${category}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
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
        </>
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
        onRowClick={(row) => router.push(`/admin/notifications/${row.id}` as never)}
        rowActions={(row) => (
          <ActionIconButton
            intent="view"
            label={t("notifications.list.openAction")}
            icon={<BellRing className="h-4 w-4" />}
            onClick={() => router.push(`/admin/notifications/${row.id}` as never)}
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
  );
}
