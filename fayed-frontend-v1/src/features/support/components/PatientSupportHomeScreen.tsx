"use client";

import { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ChatWorkspaceShell,
  ChatThreadList,
  ChatThreadListItem,
  ChatEmptyState,
} from "@/components/shared/chat/ChatKit";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { useCreatePatientSupportTicket, usePatientSupportTickets } from "../hooks/use-support";
import type {
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketCategory,
  SupportTicketSummary,
  SupportTicketsListParams,
} from "../types/support.types";
import PatientSupportTicketScreen from "./PatientSupportTicketScreen";
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

const CATEGORY_FILTERS: Array<SupportTicketCategory | "ALL"> = [
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
];

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

function CreateTicketForm({
  onCreate,
  isSubmitting,
  t,
}: {
  onCreate: (category: SupportTicketCategory, subject: string, description: string) => Promise<void>;
  isSubmitting: boolean;
  t: any;
}) {
  const [category, setCategory] = useState<SupportTicketCategory>("GENERAL");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    onCreate(category, subject.trim(), description.trim());
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="p-5 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white dark:bg-slate-900 shadow-sm min-h-[76px] flex flex-col justify-center">
        <h3 className="text-base font-bold text-text-primary dark:text-white">
          {t("create.heading")}
        </h3>
        <p className="text-xs text-text-muted mt-0.5">{t("create.note")}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8fafc]/90 dark:bg-slate-950/10">
        <div>
          <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
            {t("create.fields.category")}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
            className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 outline-none focus:border-teal-500 font-semibold"
          >
            {CATEGORY_FILTERS.filter(c => c !== "ALL").map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
            {t("create.fields.subject")}
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("create.placeholders.subject")}
            className="w-full h-11 px-3 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 outline-none focus:border-teal-500 font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
            {t("create.fields.description")}
          </label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("create.placeholders.description")}
            className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 outline-none focus:border-teal-500 font-semibold resize-none min-h-[120px]"
          />
        </div>

        <p className="text-[11px] text-text-muted leading-relaxed">
          {t("create.helper")}
        </p>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !subject.trim() || !description.trim()}
            className="w-full sm:w-auto px-6 h-11 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition active:scale-95 disabled:opacity-40 shadow-[0_4px_12px_rgba(13,148,136,0.25)] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("create.submitting")}
              </>
            ) : (
              t("create.submit")
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PatientSupportHomeScreen({ ticketId }: { ticketId?: string | null }) {
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
  const categoryFilter = parseEnumParam<SupportTicketCategory | "ALL">(
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

  const isCreating = searchParams.get("new") === "true";
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

  const tickets = usePatientSupportTickets(params);
  const create = useCreatePatientSupportTicket();
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

  const selectedTicketId = ticketId || null;

  const openTicket = (row: SupportTicketSummary) => {
    router.push(`/patient/support/${row.id}` as never);
  };

  const handleCreateTicket = async (cat: SupportTicketCategory, sub: string, desc: string) => {
    try {
      const created = await create.mutateAsync({
        category: cat,
        subject: sub,
        description: desc,
      });
      // Clear "?new=true" filter and open the new ticket
      router.push(`/patient/support/${created.item.id}` as never);
    } catch {
      // Handled by react-query error logic
    }
  };

  // If there are no tickets at all and we are not loading, default to create view on desktop
  const showCreateView = isCreating || (!selectedTicketId && filteredItems.length === 0 && !tickets.isLoading);

  return (
    <section className="h-full min-h-0 w-full overflow-hidden">
      <ChatWorkspaceShell>
        {/* Left Thread List Column */}
        <div className={cn("h-full flex flex-col min-h-0 overflow-hidden", (selectedTicketId || isCreating) ? "hidden lg:flex lg:w-[380px] lg:shrink-0" : "w-full flex lg:w-[380px] lg:shrink-0")}>
          <ChatThreadList
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={locale === "ar" ? "البحث عن تذكرة..." : "Search tickets..."}
            header={
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h1 className="text-sm font-bold text-text-primary dark:text-white">
                    {t("home.title")}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => updateListQuery({ new: "true" })}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5 transition active:scale-95 shadow-sm"
                >
                  {locale === "ar" ? "+ تذكرة جديدة" : "+ New Ticket"}
                </button>
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
                {t("list.countLoading")}...
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
        <div className={cn("h-full flex flex-col flex-1", (selectedTicketId || isCreating) ? "w-full flex" : "hidden lg:flex")}>
          {showCreateView ? (
            <CreateTicketForm
              onCreate={handleCreateTicket}
              isSubmitting={create.isPending}
              t={t}
            />
          ) : selectedTicketId ? (
            <PatientSupportTicketScreen ticketId={selectedTicketId} />
          ) : (
            <ChatEmptyState message={t("states.empty.heading")} />
          )}
        </div>
      </ChatWorkspaceShell>
    </section>
  );
}
