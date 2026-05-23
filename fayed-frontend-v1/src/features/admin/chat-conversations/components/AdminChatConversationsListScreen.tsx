"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Eye, MessagesSquare, Paperclip, Search, ShieldCheck, ShieldX } from "lucide-react";
import { DataTable, buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam, parseTextParam, type ColumnDef, type SortConfig } from "@/components/ui/data-table";
import AdminOperationalListShell from "@/components/shared/admin/AdminOperationalListShell";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import DateField from "@/components/form/input/DateField";
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { PermissionKey } from "@/lib/auth/permissions";
import { useCurrentUserPermissions } from "@/features/users/hooks/use-users";
import { useAdminChatConversationsList } from "../hooks/use-admin-chat-conversations";
import type {
  AdminChatConversationListItem,
  AdminChatConversationSortBy,
  AdminChatConversationSortDirection,
  AdminChatConversationStatusFilter,
} from "../types/admin-chat-conversations.types";
import {
  formatChatConversationDateTime,
  getChatConversationPreviewTypeTone,
  getChatConversationStatusTone,
} from "../lib/admin-chat-conversations";

const STATUS_FILTERS: Array<AdminChatConversationStatusFilter> = [
  "ALL",
  "ACTIVE",
  "SENDING_DISABLED",
  "CLOSED_BY_PRACTITIONER",
  "ARCHIVED",
];

const SORT_DIRECTION_FILTERS: Array<AdminChatConversationSortDirection> = ["desc", "asc"];

const DEFAULT_SORT_BY: AdminChatConversationSortBy = "lastMessageAt";
const DEFAULT_SORT_DIRECTION: AdminChatConversationSortDirection = "desc";

function getPreviewTypeLabel(
  t: ReturnType<typeof useTranslations>,
  previewType: AdminChatConversationListItem["lastMessagePreviewType"],
) {
  return t(`previewType.${previewType}` as Parameters<typeof t>[0]);
}

function getStatusLabel(
  t: ReturnType<typeof useTranslations>,
  item: Pick<AdminChatConversationListItem, "status" | "closedBy">,
) {
  if (item.status === "SENDING_DISABLED") {
    if (item.closedBy === "PRACTITIONER") {
      return t("status.CLOSED_BY_PRACTITIONER");
    }

    if (item.closedBy === "ADMIN") {
      return t("status.SENDING_DISABLED");
    }

    return t("status.SENDING_DISABLED");
  }

  return t(`status.${item.status}` as Parameters<typeof t>[0]);
}

function getLastActivityValue(item: AdminChatConversationListItem) {
  return item.lastMessageAt ?? item.sessionDateTime ?? item.updatedAt ?? item.createdAt;
}

function ConversationPreviewBadge({
  t,
  type,
}: {
  t: ReturnType<typeof useTranslations>;
  type: AdminChatConversationListItem["lastMessagePreviewType"];
}) {
  const tone = getChatConversationPreviewTypeTone(type);
  const toneClass =
    tone === "primary"
      ? "bg-primary-light text-text-brand"
      : tone === "success"
        ? "bg-success-50 text-success-700"
        : tone === "warning"
          ? "bg-warning-50 text-warning-700"
          : "bg-surface-secondary text-text-secondary";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
      {getPreviewTypeLabel(t, type)}
    </span>
  );
}

function StatusBadge({
  t,
  item,
}: {
  t: ReturnType<typeof useTranslations>;
  item: Pick<AdminChatConversationListItem, "status" | "closedBy">;
}) {
  const tone = getChatConversationStatusTone(item.status);
  const toneClass =
    tone === "success"
      ? "bg-success-50 text-success-700"
      : tone === "warning"
        ? "bg-warning-50 text-warning-700"
        : tone === "danger"
          ? "bg-error-50 text-error-700"
          : "bg-surface-secondary text-text-secondary";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
      {getStatusLabel(t, item)}
    </span>
  );
}

export default function AdminChatConversationsListScreen() {
  const t = useTranslations("admin-chat-conversations");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: permissionData } = useCurrentUserPermissions(true);
  const permissions = new Set(permissionData?.permissions ?? []);
  const canModerate = permissions.has(PermissionKey.CHAT_CONVERSATIONS_MODERATE);
  const canReadAttachments = permissions.has(PermissionKey.CHAT_ATTACHMENTS_READ);

  const [searchInput, setSearchInput] = useState(
    parseTextParam(searchParams.get("search"), { maxLength: 120 }),
  );

  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 100,
  });
  const status = parseEnumParam<AdminChatConversationStatusFilter>(
    searchParams.get("status"),
    STATUS_FILTERS,
    "ALL",
  );
  const fromDate = parseTextParam(searchParams.get("fromDate"), { maxLength: 32 });
  const toDate = parseTextParam(searchParams.get("toDate"), { maxLength: 32 });
  const hasAttachmentsOnly = searchParams.get("hasAttachmentsOnly") === "true";
  const sortDirection = parseEnumParam<AdminChatConversationSortDirection>(
    searchParams.get("sortDirection"),
    SORT_DIRECTION_FILTERS,
    DEFAULT_SORT_DIRECTION,
  );
  const sortBy = DEFAULT_SORT_BY;

  const hasActiveFilters =
    Boolean(searchParams.get("search")) ||
    status !== "ALL" ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    hasAttachmentsOnly ||
    sortDirection !== DEFAULT_SORT_DIRECTION;

  const params = useMemo(
    () => ({
      page,
      limit,
      search: searchInput.trim() || undefined,
      status: status === "ALL" ? undefined : status,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      hasAttachmentsOnly: hasAttachmentsOnly || undefined,
      sortBy,
      sortDirection,
    }),
    [fromDate, hasAttachmentsOnly, limit, page, searchInput, sortBy, sortDirection, status, toDate],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if ((searchParams.get("search") ?? "") === searchInput.trim()) return;
      const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), {
        search: searchInput.trim() || null,
        page: 1,
      });
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [pathname, router, searchInput, searchParams]);

  const query = useAdminChatConversationsList(params, { enabled: true });
  const data = query.data;

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const queryString = next.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const columns = useMemo<ColumnDef<AdminChatConversationListItem>[]>(
    () => [
      {
        id: "patient",
        header: t("columns.patient"),
        accessor: (row) => row.patientName ?? row.patientEmail ?? row.conversationId,
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {row.patientName ?? t("common.unknownPatient")}
            </p>
            {row.patientEmail ? (
              <p className="mt-1 truncate text-xs text-text-muted">{row.patientEmail}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "practitioner",
        header: t("columns.practitioner"),
        accessor: (row) => row.practitionerName ?? row.practitionerEmail ?? "",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white/95">
              {row.practitionerName ?? t("common.unknownPractitioner")}
            </p>
            {row.practitionerEmail ? (
              <p className="mt-1 truncate text-xs text-text-muted">{row.practitionerEmail}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "sessionDateTime",
        header: t("columns.sessionDate"),
        accessor: (row) => row.sessionDateTime ?? "",
        cell: (row) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">
              {formatChatConversationDateTime(row.sessionDateTime, locale)}
            </p>
            <p className="mt-1 truncate text-xs text-text-muted">{row.sessionCode}</p>
          </div>
        ),
      },
      {
        id: "lastMessageAt",
        header: t("columns.lastActivity"),
        accessor: (row) => getLastActivityValue(row),
        sortable: true,
        cell: (row) => formatChatConversationDateTime(getLastActivityValue(row), locale),
      },
      {
        id: "lastMessagePreviewType",
        header: t("columns.lastMessageType"),
        accessor: (row) => row.lastMessagePreviewType,
        cell: (row) => <ConversationPreviewBadge t={t} type={row.lastMessagePreviewType} />,
      },
      {
        id: "messagesCount",
        header: t("columns.messages"),
        accessor: (row) => row.messagesCount,
        cell: (row) => <span className="font-semibold text-text-primary">{row.messagesCount}</span>,
      },
      {
        id: "attachmentsCount",
        header: t("columns.attachments"),
        accessor: (row) => row.attachmentsCount,
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-semibold text-text-secondary">
            <Paperclip className="h-3.5 w-3.5" />
            {canReadAttachments ? row.attachmentsCount : "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: t("columns.status"),
        accessor: (row) => row.status,
        cell: (row) => <StatusBadge t={t} item={row} />,
      },
    ],
    [canReadAttachments, locale, t],
  );

  return (
    <AdminOperationalListShell
      eyebrow={t("page.eyebrow")}
      title={t("page.title")}
      description={t("page.description")}
      filters={
        <div className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,0.95fr)_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.search")}
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t("filters.searchPlaceholder")}
                  className="app-control w-full px-11 py-3"
                />
              </div>
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
                  })
                }
                className="app-control w-full px-4 py-3"
              >
                {STATUS_FILTERS.map((item) => (
                  <option key={item} value={item}>
                    {item === "ALL" ? t("filters.allStatuses") : t(`status.${item}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>

          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DateField
              label={t("filters.fromDate")}
              value={fromDate}
              onChange={(value) => updateListQuery({ fromDate: value || null, page: 1 })}
              placeholder={t("filters.datePlaceholder")}
            />

            <DateField
              label={t("filters.toDate")}
              value={toDate}
              onChange={(value) => updateListQuery({ toDate: value || null, page: 1 })}
              placeholder={t("filters.datePlaceholder")}
            />

            <label className="flex items-end gap-3 rounded-2xl border border-border-light bg-surface-secondary px-4 py-3">
              <input
                type="checkbox"
                checked={hasAttachmentsOnly}
                onChange={(event) =>
                  updateListQuery({ hasAttachmentsOnly: event.target.checked ? "true" : null, page: 1 })
                }
                className="mt-0.5 h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-text-primary">{t("filters.hasAttachmentsOnly")}</span>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {t("filters.sort")}
              </span>
              <select
                value={sortDirection}
                onChange={(event) =>
                  updateListQuery({
                    sortDirection: event.target.value === "asc" ? "asc" : "desc",
                    page: 1,
                  })
                }
                className="app-control w-full px-4 py-3"
              >
                {SORT_DIRECTION_FILTERS.map((direction) => (
                  <option key={direction} value={direction}>
                    {direction === "desc" ? t("filters.sortNewest") : t("filters.sortOldest")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-secondary">
              {data
                ? t("list.count", { value: data.pagination.totalItems })
                : t("list.countLoading")}
            </p>
            <FilterClearButton
              disabled={!hasActiveFilters}
              onClick={() =>
                updateListQuery({
                  search: null,
                  status: null,
                  fromDate: null,
                  toDate: null,
                  hasAttachmentsOnly: null,
                  sortDirection: DEFAULT_SORT_DIRECTION,
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
        getRowId={(row) => row.conversationId}
        loading={query.isLoading}
        error={query.isError ? t("errors.loadFailed") : null}
        errorState={{
          title: t("errors.title"),
          description: t("errors.loadFailed"),
          action: {
            label: t("errors.retry"),
            onClick: () => query.refetch(),
          },
        }}
        sortConfig={{
          column: "lastMessageAt",
          direction: sortDirection,
        } satisfies SortConfig}
        onSortChange={(nextSort) =>
          updateListQuery({
            sortDirection: nextSort.direction,
            page: 1,
          })
        }
        rowActionsHeader={t("columns.actions")}
        rowActions={(row) => (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <ActionIconButton
              intent="view"
              label={t("actions.viewDetails")}
              icon={<Eye className="h-4 w-4" />}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                router.push(`/admin/chat-conversations/${row.conversationId}` as never);
              }}
            />

            {canModerate && row.status === "ACTIVE" ? (
              <ActionIconButton
                intent="deactivate"
                label={t("actions.disableSending")}
                icon={<ShieldX className="h-4 w-4" />}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  router.push(`/admin/chat-conversations/${row.conversationId}?action=disable` as never);
                }}
              />
            ) : null}

            {canModerate && row.status === "SENDING_DISABLED" && row.closedBy === "ADMIN" ? (
              <ActionIconButton
                intent="publish"
                label={t("actions.enableSending")}
                icon={<ShieldCheck className="h-4 w-4" />}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  router.push(`/admin/chat-conversations/${row.conversationId}?action=enable` as never);
                }}
              />
            ) : null}
          </div>
        )}
        onRowClick={(row) => router.push(`/admin/chat-conversations/${row.conversationId}` as never)}
        pagination={
          data
            ? {
                page: data.pagination.page,
                limit: data.pagination.limit,
                totalItems: data.pagination.totalItems,
                totalPages: data.pagination.totalPages,
                hasPrevPage: data.pagination.page > 1,
                hasNextPage: data.pagination.page < data.pagination.totalPages,
              }
            : undefined
        }
        onPageChange={(nextPage) => updateListQuery({ page: nextPage })}
        onPageSizeChange={(nextLimit) => updateListQuery({ limit: nextLimit, page: 1 })}
        pageSizeOptions={DEFAULT_PAGE_SIZE_OPTIONS}
        emptyState={{
          icon: <MessagesSquare className="h-5 w-5 text-primary" />,
          title: t("states.empty.title"),
          description: t("states.empty.description"),
        }}
        ariaLabel={t("page.title")}
        caption={t("page.title")}
      />
    </AdminOperationalListShell>
  );
}
