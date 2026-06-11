"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Headset, MessageSquareMore } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import PractitionerOperationalListShell, { PractitionerSummaryCard } from "@/components/shared/practitioner/PractitionerOperationalListShell";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { usePractitionerSupportTickets } from "../hooks/use-support";
import type {
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketSummary,
  SupportTicketsListParams,
} from "../types/support.types";

const STATUS_FILTERS: Array<SupportTicketStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "RESOLVED",
  "CLOSED",
];

const CATEGORY_FILTERS = [
  "ALL",
  "BOOKING",
  "PAYMENT",
  "SESSION",
  "TECHNICAL",
  "ACCOUNT",
  "MATCHING",
  "GENERAL",
  "CONTENT",
  "CHAT",
  "OTHER",
] as const;

const PRIORITY_FILTERS: Array<SupportTicketPriority | "ALL"> = [
  "ALL",
  "URGENT",
  "HIGH",
  "NORMAL",
  "LOW",
];

const PRIORITY_DOT: Record<SupportTicketPriority, string> = {
  LOW: "bg-text-muted",
  NORMAL: "bg-text-muted",
  MEDIUM: "bg-text-muted",
  HIGH: "bg-amber-400",
  URGENT: "bg-rose-500",
};

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

function shortId(value: string | null) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getStatusTone(status: SupportTicketStatus) {
  switch (status) {
    case "OPEN":
    case "IN_PROGRESS":
      return "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light";
    case "WAITING_FOR_USER":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300";
    case "RESOLVED":
      return "bg-success-50 text-success-700 dark:bg-success-500/12 dark:text-success-300";
    case "CLOSED":
      return "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/55";
    default:
      return "bg-surface-tertiary text-text-secondary";
  }
}

export default function PractitionerSupportHomeScreen() {
  const t = useTranslations("support");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusFilter = parseEnumParam<SupportTicketStatus | "ALL">(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const categoryFilter = parseEnumParam<(typeof CATEGORY_FILTERS)[number]>(
    searchParams.get("category"),
    CATEGORY_FILTERS,
    "ALL",
  );
  const priorityFilter = parseEnumParam<SupportTicketPriority | "ALL">(
    searchParams.get("priority"),
    PRIORITY_FILTERS,
    "ALL",
  );
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 40,
  });

  const hasActiveFilters =
    statusFilter !== "ALL" || categoryFilter !== "ALL" || priorityFilter !== "ALL";

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const params: SupportTicketsListParams = useMemo(
    () => ({
      page,
      limit,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      category: categoryFilter === "ALL" ? undefined : categoryFilter,
      priority: priorityFilter === "ALL" ? undefined : priorityFilter,
    }),
    [categoryFilter, limit, page, priorityFilter, statusFilter],
  );

  const tickets = usePractitionerSupportTickets(params);
  const data = tickets.data;

  const columns = useMemo<ColumnDef<SupportTicketSummary>[]>(
    () => [
      {
        id: "subject",
        header: locale.startsWith("ar") ? "التذكرة" : "Ticket",
        accessor: (row) => row.subject,
        cell: (row) => (
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                {row.subject}
              </p>
              {row.hasUnread || row.unreadCount > 0 ? (
                <span className="inline-flex shrink-0 items-center rounded-full bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                  <span className="me-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
                  {row.unreadCount > 0 ? row.unreadCount : ""}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-text-muted">
              {t(`categories.${row.category}` as Parameters<typeof t>[0])}
              {row.relatedSessionId ? ` / ${shortId(row.relatedSessionId)}` : ""}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: locale.startsWith("ar") ? "الحالة" : "Status",
        accessor: (row) => row.status,
        cell: (row) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(row.status)}`}>
            {t(`statuses.${row.status}` as Parameters<typeof t>[0])}
          </span>
        ),
      },
      {
        id: "priority",
        header: locale.startsWith("ar") ? "الأولوية" : "Priority",
        accessor: (row) => row.priority,
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <span className={`inline-block h-2 w-2 rounded-full ${PRIORITY_DOT[row.priority]}`} />
            {t(`priorities.${row.priority}` as Parameters<typeof t>[0])}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        id: "relatedReference",
        header: locale.startsWith("ar") ? "المرجع" : "Reference",
        accessor: (row) =>
          row.relatedSessionId ??
          row.relatedPaymentId ??
          row.relatedInstantBookingRequestId ??
          row.relatedMatchingSessionId ??
          row.relatedAssessmentSubmissionId ??
          "",
        cell: (row) => {
          const value =
            row.relatedSessionId ??
            row.relatedPaymentId ??
            row.relatedInstantBookingRequestId ??
            row.relatedMatchingSessionId ??
            row.relatedAssessmentSubmissionId;

          return value ? (
            <span className="font-mono text-xs text-text-secondary">{shortId(value)}</span>
          ) : (
            <span className="text-xs text-text-muted">-</span>
          );
        },
        hideOnMobile: true,
      },
      {
        id: "createdAt",
        header: locale.startsWith("ar") ? "التاريخ" : "Created",
        accessor: (row) => new Date(row.createdAt).getTime(),
        cell: (row) => formatDateTime(row.createdAt, locale),
        hideOnMobile: true,
      },
      {
        id: "lastMessageAt",
        header: locale.startsWith("ar") ? "آخر رد" : "Last reply",
        accessor: (row) => (row.lastMessageAt ? new Date(row.lastMessageAt).getTime() : 0),
        cell: (row) => (
          <span className="text-xs text-text-secondary">
            {formatDateTime(row.lastMessageAt, locale)}
          </span>
        ),
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  const openTicket = (row: SupportTicketSummary) => {
    router.push(`/practitioner/support/${row.id}` as never);
  };

  return (
    <PractitionerOperationalListShell
      eyebrow={t("practitioner.home.eyebrow")}
      title={t("practitioner.home.title")}
      description={t("practitioner.home.note")}
      summaryCards={
        <PractitionerSummaryCard
          label={t("practitioner.list.heading")}
          value={data ? String(data.pagination.totalItems) : t("practitioner.list.countLoading")}
          hint={t("practitioner.list.note")}
          tone="primary"
          metricKey="support.total"
        />
      }
      filters={
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("filters.all")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                updateListQuery({ status: event.target.value === "ALL" ? null : event.target.value, page: 1 })
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
              {locale.startsWith("ar") ? "الفئة" : "Category"}
            </span>
            <select
              value={categoryFilter}
              onChange={(event) =>
                updateListQuery({ category: event.target.value === "ALL" ? null : event.target.value, page: 1 })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("filters.all")}</option>
              {CATEGORY_FILTERS.filter((category) => category !== "ALL").map((category) => (
                <option key={category} value={category}>
                  {t(`categories.${category}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {locale.startsWith("ar") ? "الأولوية" : "Priority"}
            </span>
            <select
              value={priorityFilter}
              onChange={(event) =>
                updateListQuery({ priority: event.target.value === "ALL" ? null : event.target.value, page: 1 })
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

          <div className="flex items-end justify-end">
            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={() =>
                updateListQuery({
                  status: null,
                  category: null,
                  priority: null,
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
          icon: <MessageSquareMore className="h-5 w-5 text-primary" />,
          title: t("states.empty.heading"),
          description: t("states.empty.note"),
        }}
        onRowClick={openTicket}
        rowActions={(row) => (
          <ActionIconButton
            intent="view"
            label={t("list.openTicket")}
            icon={<Headset className="h-4 w-4" />}
            onClick={() => openTicket(row)}
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
        pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
        ariaLabel={t("list.heading")}
        caption={t("list.heading")}
        size="sm"
      />
    </PractitionerOperationalListShell>
  );
}
