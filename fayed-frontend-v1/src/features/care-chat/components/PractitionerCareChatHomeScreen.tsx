"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { MessageSquareMore, Eye } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { usePractitionerCareChatRequests } from "../hooks/use-care-chat";
import type { CareChatListParams, CareChatRequestItem, CareChatRequestStatus } from "../types/care-chat.types";
import { CARE_CHAT_REQUEST_STATUS_STYLES, formatCareChatDateTime } from "../lib/care-chat-ui";

const PRACTITIONER_FILTERS: Array<CareChatRequestStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
  "CANCELLED",
];

function shortId(value: string | null) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export default function PractitionerCareChatHomeScreen() {
  const t = useTranslations("care-chat");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusFilter = parseEnumParam<CareChatRequestStatus | "ALL">(
    searchParams.get("status"),
    PRACTITIONER_FILTERS,
    "ALL",
  );
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 40,
  });

  const hasActiveFilters = statusFilter !== "ALL";

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const params: CareChatListParams = useMemo(
    () => ({
      page,
      limit,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    }),
    [limit, page, statusFilter],
  );

  const requests = usePractitionerCareChatRequests(params);
  const data = requests.data;

  const columns = useMemo<ColumnDef<CareChatRequestItem>[]>(
    () => [
      {
        id: "patient",
        header: locale.startsWith("ar") ? "العميل" : "Patient",
        accessor: (row) => row.patient.displayName ?? "",
        cell: (row) => (
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
                {row.patient.displayName ?? t("practitioner.fallbacks.patient")}
              </p>
              {row.hasUnread || row.unreadCount > 0 ? (
                <span className="inline-flex shrink-0 items-center rounded-full bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                  <span className="me-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
                  {row.unreadCount > 0 ? row.unreadCount : ""}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-text-muted">
              {row.reason?.trim().length ? row.reason : t("practitioner.home.note")}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: locale.startsWith("ar") ? "الحالة" : "Status",
        accessor: (row) => row.status,
        cell: (row) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CARE_CHAT_REQUEST_STATUS_STYLES[row.status]}`}>
            {t(`common.requestStatuses.${row.status}` as Parameters<typeof t>[0])}
          </span>
        ),
      },
      {
        id: "session",
        header: locale.startsWith("ar") ? "الجلسة" : "Session",
        accessor: (row) => row.relatedSessionId ?? "",
        cell: (row) =>
          row.relatedSessionId ? (
            <span className="font-mono text-xs text-text-secondary">{shortId(row.relatedSessionId)}</span>
          ) : (
            <span className="text-xs text-text-muted">-</span>
          ),
        hideOnMobile: true,
      },
      {
        id: "requestedAt",
        header: locale.startsWith("ar") ? "تاريخ الطلب" : "Requested",
        accessor: (row) => new Date(row.requestedAt).getTime(),
        cell: (row) => formatCareChatDateTime(row.requestedAt, locale),
      },
      {
        id: "reviewedAt",
        header: locale.startsWith("ar") ? "تاريخ المراجعة" : "Reviewed",
        accessor: (row) => (row.reviewedAt ? new Date(row.reviewedAt).getTime() : 0),
        cell: (row) => (
          <span className="text-xs text-text-secondary">
            {formatCareChatDateTime(row.reviewedAt, locale)}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        id: "expiresAt",
        header: locale.startsWith("ar") ? "ينتهي" : "Expires",
        accessor: (row) => (row.expiresAt ? new Date(row.expiresAt).getTime() : 0),
        cell: (row) => (
          <span className="text-xs text-text-secondary">
            {formatCareChatDateTime(row.expiresAt, locale)}
          </span>
        ),
        hideOnMobile: true,
      },
    ],
    [locale, t],
  );

  const openRequest = (row: CareChatRequestItem) => {
    router.push(`/practitioner/care-chat/${row.id}` as never);
  };

  return (
    <AdminOperationalListShell
      eyebrow={t("practitioner.home.eyebrow")}
      title={t("practitioner.home.title")}
      description={t("practitioner.home.note")}
      summaryCards={
        <AdminSummaryCard
          label={t("practitioner.list.heading")}
          value={data ? String(data.pagination.totalItems) : t("practitioner.list.countLoading")}
          hint={t("practitioner.list.note")}
          tone="primary"
        />
      }
      filters={
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block min-w-[220px] flex-1">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {t("common.filters.all")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                updateListQuery({ status: event.target.value === "ALL" ? null : event.target.value, page: 1 })
              }
              className="app-control w-full px-4 py-3"
            >
              <option value="ALL">{t("common.filters.all")}</option>
              {PRACTITIONER_FILTERS.filter((status) => status !== "ALL").map((status) => (
                <option key={status} value={status}>
                  {t(`common.requestStatuses.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <FilterClearButton
            disabled={!hasActiveFilters}
            onClick={() =>
              updateListQuery({
                status: null,
                page: 1,
              })
            }
          />
        </div>
      }
    >
      <DataTable
        data={data?.items ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        loading={requests.isLoading}
        error={requests.isError ? t("practitioner.list.states.error.note") : null}
        errorState={{
          title: t("practitioner.list.states.error.heading"),
          description: t("practitioner.list.states.error.note"),
          action: {
            label: t("practitioner.list.states.error.retry"),
            onClick: () => requests.refetch(),
          },
        }}
        emptyState={{
          icon: <MessageSquareMore className="h-5 w-5 text-primary" />,
          title: t("practitioner.list.states.empty.heading"),
          description: t("practitioner.list.states.empty.note"),
        }}
        onRowClick={openRequest}
        rowActions={(row) => (
          <ActionIconButton
            intent="view"
            label={t("common.actions.reviewRequest")}
            icon={<Eye className="h-4 w-4" />}
            onClick={() => openRequest(row)}
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
        ariaLabel={t("practitioner.list.heading")}
        caption={t("practitioner.list.heading")}
        size="sm"
      />
    </AdminOperationalListShell>
  );
}
