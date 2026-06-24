"use client";

import { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChatWorkspaceShell,
  ChatThreadList,
  ChatThreadListItem,
  ChatEmptyState,
} from "@/components/shared/chat/ChatKit";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { usePractitionerSupportTickets } from "../hooks/use-support";
import type {
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketSummary,
  SupportTicketsListParams,
} from "../types/support.types";
import PractitionerSupportTicketScreen from "./PractitionerSupportTicketScreen";
import { buildUpdatedSearchParams, parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";

const STATUS_FILTERS: Array<SupportTicketStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "ESCALATED",
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
  "MEDIUM",
  "NORMAL",
  "LOW",
];

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

export default function PractitionerSupportHomeScreen({ ticketId }: { ticketId?: string | null }) {
  const t = useTranslations("support");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.subject.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }, [data?.items, searchQuery]);

  const firstTicketId = data?.items?.[0]?.id || null;
  const selectedTicketId = ticketId || firstTicketId;

  const openTicket = (row: SupportTicketSummary) => {
    router.push(`/practitioner/support/${row.id}` as never);
  };

  return (
    <section className="h-full min-h-0 w-full overflow-hidden">
      <ChatWorkspaceShell>
        {/* Left Thread List Column */}
        <div className={cn("h-full flex flex-col min-h-0 overflow-hidden", ticketId ? "hidden lg:flex lg:w-[380px] lg:shrink-0" : "w-full flex lg:w-[380px] lg:shrink-0")}>
          <ChatThreadList
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={locale === "ar" ? "البحث عن تذكرة..." : "Search tickets..."}
            header={
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h1 className="text-sm font-bold text-text-primary dark:text-white">
                    {t("practitioner.home.eyebrow")}
                  </h1>
                </div>
                {data && (
                  <span className="rounded-full bg-teal-50 dark:bg-teal-950/40 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-400 border border-teal-100/30">
                    {data.pagination.totalItems}
                  </span>
                )}
              </div>
            }
          >
            {/* Filters row */}
            <div className="px-3 pb-3 pt-1 border-b border-slate-100 dark:border-white/5 grid grid-cols-3 gap-2 shrink-0 mb-1">
              <select
                value={statusFilter}
                onChange={(e) => updateListQuery({ status: e.target.value === "ALL" ? null : e.target.value, page: 1 })}
                className={cn(
                  "h-11 px-2.5 w-full text-xs rounded-xl border transition-all duration-200 outline-none font-bold cursor-pointer text-center shadow-sm",
                  statusFilter !== "ALL"
                    ? "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900/60 dark:text-teal-400 font-extrabold"
                    : "border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-text-secondary dark:text-slate-300 hover:bg-slate-100/60 hover:border-slate-300"
                )}
              >
                <option value="ALL">{locale === "ar" ? "الحالة" : "Status"}</option>
                {STATUS_FILTERS.filter((status) => status !== "ALL").map((status) => (
                  <option key={status} value={status}>
                    {t(`statuses.${status}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => updateListQuery({ category: e.target.value === "ALL" ? null : e.target.value, page: 1 })}
                className={cn(
                  "h-11 px-2.5 w-full text-xs rounded-xl border transition-all duration-200 outline-none font-bold cursor-pointer text-center shadow-sm",
                  categoryFilter !== "ALL"
                    ? "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900/60 dark:text-teal-400 font-extrabold"
                    : "border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-text-secondary dark:text-slate-300 hover:bg-slate-100/60 hover:border-slate-300"
                )}
              >
                <option value="ALL">{locale === "ar" ? "الفئة" : "Category"}</option>
                {CATEGORY_FILTERS.filter((category) => category !== "ALL").map((category) => (
                  <option key={category} value={category}>
                    {t(`categories.${category}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => updateListQuery({ priority: e.target.value === "ALL" ? null : e.target.value, page: 1 })}
                className={cn(
                  "h-11 px-2.5 w-full text-xs rounded-xl border transition-all duration-200 outline-none font-bold cursor-pointer text-center shadow-sm",
                  priorityFilter !== "ALL"
                    ? "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900/60 dark:text-teal-400 font-extrabold"
                    : "border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-text-secondary dark:text-slate-300 hover:bg-slate-100/60 hover:border-slate-300"
                )}
              >
                <option value="ALL">{locale === "ar" ? "الأولوية" : "Priority"}</option>
                {PRIORITY_FILTERS.filter((priority) => priority !== "ALL").map((priority) => (
                  <option key={priority} value={priority}>
                    {t(`priorities.${priority}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters Option */}
            {hasActiveFilters && (
              <div className="px-4 pb-2.5 pt-1 flex justify-end shrink-0 border-b border-slate-50 dark:border-white/5">
                <button
                  onClick={() =>
                    updateListQuery({
                      status: null,
                      category: null,
                      priority: null,
                      page: 1,
                    })
                  }
                  className="text-[10px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 transition"
                >
                  {locale === "ar" ? "إعادة تعيين الفلاتر" : "Reset Filters"}
                </button>
              </div>
            )}

            {/* Threads list */}
            {tickets.isLoading ? (
              <div className="flex items-center justify-center p-8 text-xs text-text-muted animate-pulse">
                {t("practitioner.list.countLoading")}...
              </div>
            ) : tickets.isError ? (
              <div className="p-4 text-center">
                <p className="text-xs text-rose-500 mb-2">{t("states.listError.note")}</p>
                <button
                  onClick={() => tickets.refetch()}
                  className="text-xs font-semibold text-primary underline"
                >
                  {t("states.listError.retry")}
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                {t("states.empty.heading")}
              </div>
            ) : (
              filteredItems.map((ticket) => (
                <ChatThreadListItem
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  thread={{
                    id: ticket.id,
                    title: ticket.subject,
                    subtitle: t(`categories.${ticket.category}` as Parameters<typeof t>[0]),
                    lastMessage: locale === "ar" ? "اضغط لعرض المحادثة..." : "Click to view conversation...",
                    lastMessageAt: formatDateTime(ticket.lastMessageAt || ticket.createdAt, locale),
                    unreadCount: ticket.unreadCount,
                    lane: "support",
                    statusLabel: t(`statuses.${ticket.status}` as Parameters<typeof t>[0]),
                    priorityLabel: t(`priorities.${ticket.priority}` as Parameters<typeof t>[0]),
                    isActive: ticket.id === selectedTicketId,
                  }}
                />
              ))
            )}

            {/* Compact pagination controls */}
            {data && data.pagination.totalPages > 1 && (
              <div className="mt-auto p-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-text-muted bg-white dark:bg-transparent shrink-0">
                <button
                  disabled={data.pagination.page <= 1}
                  onClick={() => updateListQuery({ page: data.pagination.page - 1 })}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40"
                >
                  {locale.startsWith("ar") ? "السابق" : "Prev"}
                </button>
                <span>
                  {data.pagination.page} / {data.pagination.totalPages}
                </span>
                <button
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  onClick={() => updateListQuery({ page: data.pagination.page + 1 })}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40"
                >
                  {locale.startsWith("ar") ? "التالي" : "Next"}
                </button>
              </div>
            )}
          </ChatThreadList>
        </div>

        {/* Right Conversation Panel / Empty State Column */}
        <div className={cn("h-full flex flex-col flex-1", ticketId ? "w-full flex" : "hidden lg:flex")}>
          {selectedTicketId ? (
            <PractitionerSupportTicketScreen ticketId={selectedTicketId} />
          ) : (
            <ChatEmptyState message={t("states.empty.heading")} />
          )}
        </div>
      </ChatWorkspaceShell>
    </section>
  );
}
