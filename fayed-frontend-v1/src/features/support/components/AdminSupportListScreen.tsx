"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Headset } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import type { ColumnDef, SortConfig } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import { useAdminSupportTickets } from "../hooks/use-support";
import type {
  AdminSupportListParams,
  SupportTicketPriority,
  SupportTicketSummary,
  SupportTicketStatus,
} from "../types/support.types";

const STATUS_FILTERS: Array<SupportTicketStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

const PRIORITY_FILTERS: Array<SupportTicketPriority | "ALL"> = [
  "ALL",
  "URGENT",
  "HIGH",
  "NORMAL",
  "LOW",
];
const PAGE_LIMIT = 20;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 40, 50];
const SORTABLE_COLUMNS = ["createdAt", "lastMessageAt", "status", "priority", "subject"] as const;
type SortableSupportColumn = (typeof SORTABLE_COLUMNS)[number];

const PRIORITY_DOT: Record<SupportTicketPriority, string> = {
  LOW: "bg-text-muted",
  NORMAL: "bg-text-muted",
  MEDIUM: "bg-text-muted",
  HIGH: "bg-amber-400",
  URGENT: "bg-rose-500",
};

function formatDateTime(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

function getStatusTone(status: SupportTicketStatus) {
  switch (status) {
    case "OPEN":
      return "bg-primary-light text-text-brand";
    case "IN_PROGRESS":
      return "bg-primary-light text-text-brand";
    case "WAITING_FOR_USER":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300";
    case "ESCALATED":
      return "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300";
    case "RESOLVED":
      return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300";
    case "CLOSED":
      return "bg-surface-tertiary text-text-secondary";
    default:
      return "bg-surface-tertiary text-text-secondary";
  }
}

export default function AdminSupportListScreen() {
  const t = useTranslations("support.admin");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const numLocale = locale === "ar" ? "ar-SA" : "en-US";

  const statusFilter = parseEnumParam<SupportTicketStatus | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const priorityFilter = parseEnumParam<SupportTicketPriority | "ALL">(
    searchParams.get("priority"),
    PRIORITY_FILTERS,
    "ALL",
  );
  const assignedToMe = searchParams.get("assignedToMe") === "true";
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), PAGE_LIMIT, {
    min: 1,
    max: 40,
  });
  const sortColumn = parseEnumParam<SortableSupportColumn>(
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
    statusFilter !== "ALL" || priorityFilter !== "ALL" || assignedToMe;

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const params: AdminSupportListParams = useMemo(
    () => ({
      page,
      limit,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      priority: priorityFilter === "ALL" ? undefined : priorityFilter,
      assignedToMe: assignedToMe || undefined,
    }),
    [assignedToMe, page, priorityFilter, statusFilter, limit],
  );

  const tickets = useAdminSupportTickets(params);
  const data = tickets.data;

  const columns = useMemo<ColumnDef<SupportTicketSummary>[]>(() => [
    {
      id: "subject",
      header: "Ticket",
      accessor: (row) => row.subject,
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
            {row.subject}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {t(`categories.${row.category}` as Parameters<typeof t>[0])}
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
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(row.status)}`}>
          {t(`statuses.${row.status}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      accessor: (row) => row.priority,
      sortable: true,
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
          <span className={`inline-block h-2 w-2 rounded-full ${PRIORITY_DOT[row.priority]}`} />
          {t(`priorities.${row.priority}` as Parameters<typeof t>[0])}
        </span>
      ),
    },
    {
      id: "assignee",
      header: "Assignee",
      accessor: (row) => row.assignedAdminUserId ?? "",
      cell: (row) =>
        row.assignedAdminUserId ? (
          <span className="font-mono text-xs text-text-secondary">
            {row.assignedAdminUserId.slice(0, 8)}
          </span>
        ) : (
          <span className="text-xs text-text-muted">{t("list.unassigned")}</span>
        ),
      hideOnMobile: true,
    },
    {
      id: "createdAt",
      header: "Created",
      accessor: (row) => new Date(row.createdAt).getTime(),
      sortable: true,
      hideOnMobile: true,
      cell: (row) => formatDateTime(row.createdAt, numLocale),
    },
    {
      id: "lastMessageAt",
      header: "Last reply",
      accessor: (row) => (row.lastMessageAt ? new Date(row.lastMessageAt).getTime() : null),
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-text-secondary">
          {row.lastMessageAt ? formatDateTime(row.lastMessageAt, numLocale) : "-"}
        </span>
      ),
      hideOnMobile: true,
    },
  ], [numLocale, t]);

  return (
    <AdminOperationalListShell
      title={t("list.heading")}
      description={t("list.note")}
      summaryCards={
        <AdminSummaryCard
          label={t("list.heading")}
          value={typeof data?.pagination.totalItems === "number" ? data.pagination.totalItems : "..."}
          tone="primary"
        />
      }
      filters={
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.all")}
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
              <option value="ALL">{t("filters.all")}</option>
              {STATUS_FILTERS.filter((status) => status !== "ALL").map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.all")}
            </span>
            <select
              value={priorityFilter}
              onChange={(event) =>
                updateListQuery({
                  priority: event.target.value === "ALL" ? null : event.target.value,
                  page: 1,
                })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.all")}</option>
              {PRIORITY_FILTERS.filter((priority) => priority !== "ALL").map((priority) => (
                <option key={priority} value={priority}>
                  {t(`priorities.${priority}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-primary dark:bg-white/5 dark:text-white/90">
            <input
              type="checkbox"
              checked={assignedToMe}
              onChange={(event) =>
                updateListQuery({
                  assignedToMe: event.target.checked ? "true" : null,
                  page: 1,
                })
              }
              className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
            />
            {t("filters.assignedToMe")}
          </label>
          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={() =>
                updateListQuery({
                  status: null,
                  priority: null,
                  assignedToMe: null,
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
        loading={tickets.isLoading}
        error={tickets.isError ? t("states.listError.note") : null}
        errorState={{
          title: t("states.listError.heading"),
          description: t("states.listError.note"),
          action: {
            label: t("states.listError.retry"),
            onClick: () => tickets.refetch(),
          },
        }}
        emptyState={{
          icon: <Headset className="h-5 w-5 text-primary" />,
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
            label={t("list.openTicket")}
            icon={<Headset className="h-4 w-4" />}
            onClick={() => router.push(`/admin/support/${row.id}` as never)}
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
        ariaLabel={t("list.heading")}
        caption={t("list.heading")}
      />
    </AdminOperationalListShell>
  );
}
