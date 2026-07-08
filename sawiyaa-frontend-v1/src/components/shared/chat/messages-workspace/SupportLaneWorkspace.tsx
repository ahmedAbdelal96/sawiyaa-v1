"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChatThreadListItem, ChatEmptyState } from "@/components/shared/chat/ChatKit";
import SupportLaneThread from "@/features/messages-shell/components/SupportLaneThread";
import {
  usePatientSupportTickets,
  usePractitionerSupportTickets,
  useAdminSupportTickets,
} from "@/features/support/hooks/use-support";
import PatientSupportTicketScreen from "@/features/support/components/PatientSupportTicketScreen";
import PractitionerSupportTicketScreen from "@/features/support/components/PractitionerSupportTicketScreen";
import AdminSupportTicketScreen from "@/features/support/components/AdminSupportTicketScreen";
import { parseEnumParam, parsePositiveIntParam } from "@/components/ui/data-table";
import { formatDateTime } from "./messages-workspace.utils";
import { getMessagesPath } from "@/features/messages-shell/utils/messages-routes";
import type { LaneWorkspaceProps } from "./messages-workspace.types";
import type {
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketCategory,
} from "@/features/support/types/support.types";

const SUPPORT_STATUS_FILTERS: Array<SupportTicketStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

const SUPPORT_CATEGORY_FILTERS: Array<SupportTicketCategory | "ALL"> = [
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

const SUPPORT_PRIORITY_FILTERS: Array<SupportTicketPriority | "ALL"> = [
  "ALL",
  "URGENT",
  "HIGH",
  "MEDIUM",
  "NORMAL",
  "LOW",
];

export default function SupportLaneWorkspace({
  role,
  locale,
  selectedId,
  relatedSessionId,
  page,
  limit,
  updateListQuery,
  searchQuery,
  renderMode,
}: LaneWorkspaceProps & { renderMode: "list" | "detail" }) {
  const t = useTranslations("support");
  const tAdmin = useTranslations("support.admin");
  const searchParams = useSearchParams();

  const [readPendingThreadIds, setReadPendingThreadIds] = useState<string[]>([]);

  useEffect(() => {
    const handler = () => {
      setReadPendingThreadIds([]);
    };
    window.addEventListener("unified-messages:unread-summary:dirty", handler);
    return () => {
      window.removeEventListener("unified-messages:unread-summary:dirty", handler);
    };
  }, []);

  const supportStatusFilter = parseEnumParam<SupportTicketStatus | "ALL">(
    searchParams.get("status"),
    SUPPORT_STATUS_FILTERS,
    "ALL",
  );
  const supportCategoryFilter = parseEnumParam<SupportTicketCategory | "ALL">(
    searchParams.get("category"),
    SUPPORT_CATEGORY_FILTERS,
    "ALL",
  );
  const supportPriorityFilter = parseEnumParam<SupportTicketPriority | "ALL">(
    searchParams.get("priority"),
    SUPPORT_PRIORITY_FILTERS,
    "ALL",
  );
  const adminAssignedToMe = searchParams.get("assignedToMe") === "true";

  const supportHasActiveFilters =
    supportStatusFilter !== "ALL" ||
    supportCategoryFilter !== "ALL" ||
    supportPriorityFilter !== "ALL" ||
    (role === "admin" && adminAssignedToMe);

  const supportParams = useMemo(
    () => ({
      page,
      limit,
      status: supportStatusFilter === "ALL" ? undefined : supportStatusFilter,
      category: supportCategoryFilter === "ALL" ? undefined : supportCategoryFilter,
      priority: supportPriorityFilter === "ALL" ? undefined : supportPriorityFilter,
      assignedToMe: role === "admin" && adminAssignedToMe ? true : undefined,
    }),
    [role, page, limit, supportStatusFilter, supportCategoryFilter, supportPriorityFilter, adminAssignedToMe],
  );

  const patientSupportQuery = usePatientSupportTickets(supportParams);
  const practitionerSupportQuery = usePractitionerSupportTickets(supportParams);
  const adminSupportQuery = useAdminSupportTickets(supportParams, {
    enabled: role === "admin" && renderMode === "list",
  });

  const supportQuery =
    role === "patient"
      ? patientSupportQuery
      : role === "practitioner"
      ? practitionerSupportQuery
      : adminSupportQuery;

  const supportData = supportQuery.data;
  const shouldOpenSupportCompose =
    renderMode === "detail" &&
    role !== "admin" &&
    Boolean(relatedSessionId?.trim()) &&
    !selectedId;

  const filteredSupportItems = useMemo(() => {
    const items = supportData?.items ?? [];
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.subject.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }, [supportData?.items, searchQuery]);

  const defaultSupportTicketId = supportData?.items?.[0]?.id || null;
  const activeSupportTicketId = selectedId || (shouldOpenSupportCompose ? null : defaultSupportTicketId);

  useEffect(() => {
    if (activeSupportTicketId && supportData?.items) {
      const ticket = supportData.items.find((t) => t.id === activeSupportTicketId);
      if (ticket) {
        const isActuallyUnread = ticket.unreadCount > 0 || ticket.hasUnread === true;
        if (isActuallyUnread) {
          setReadPendingThreadIds((prev) => {
            if (prev.includes(activeSupportTicketId)) return prev;
            return [...prev, activeSupportTicketId];
          });
        }
      }
    }
  }, [activeSupportTicketId, supportData?.items]);

  if (renderMode === "list") {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Sub-filters UI */}
        <div className="px-3 pb-2 pt-1 border-b border-slate-100 dark:border-white/5 space-y-2 shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={supportStatusFilter}
              onChange={(e) =>
                updateListQuery({ status: e.target.value === "ALL" ? null : e.target.value, page: 1 })
              }
              className={cn(
                "h-11 px-2 w-full text-xs rounded-xl border transition-all duration-200 outline-none font-bold cursor-pointer text-center shadow-sm",
                supportStatusFilter !== "ALL"
                  ? "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900/60 dark:text-teal-400 font-extrabold"
                  : "border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-text-secondary dark:text-slate-300 hover:bg-slate-100/60 hover:border-slate-300"
              )}
            >
              <option value="ALL">{locale === "ar" ? "الحالة" : "Status"}</option>
              {SUPPORT_STATUS_FILTERS.filter((status) => status !== "ALL").map((status) => (
                <option key={status} value={status}>
                  {role === "admin"
                    ? tAdmin(`statuses.${status}` as Parameters<typeof tAdmin>[0])
                    : t(`statuses.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>

            <select
              value={supportCategoryFilter}
              onChange={(e) =>
                updateListQuery({ category: e.target.value === "ALL" ? null : e.target.value, page: 1 })
              }
              className={cn(
                "h-11 px-2 w-full text-xs rounded-xl border transition-all duration-200 outline-none font-bold cursor-pointer text-center shadow-sm",
                supportCategoryFilter !== "ALL"
                  ? "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900/60 dark:text-teal-400 font-extrabold"
                  : "border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-text-secondary dark:text-slate-300 hover:bg-slate-100/60 hover:border-slate-300"
              )}
            >
              <option value="ALL">{locale === "ar" ? "الفئة" : "Category"}</option>
              {SUPPORT_CATEGORY_FILTERS.filter((category) => category !== "ALL").map((category) => (
                <option key={category} value={category}>
                  {role === "admin"
                    ? tAdmin(`categories.${category}` as Parameters<typeof tAdmin>[0])
                    : t(`categories.${category}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>

            <select
              value={supportPriorityFilter}
              onChange={(e) =>
                updateListQuery({ priority: e.target.value === "ALL" ? null : e.target.value, page: 1 })
              }
              className={cn(
                "h-11 px-2 w-full text-xs rounded-xl border transition-all duration-200 outline-none font-bold cursor-pointer text-center shadow-sm",
                supportPriorityFilter !== "ALL"
                  ? "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900/60 dark:text-teal-400 font-extrabold"
                  : "border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 text-text-secondary dark:text-slate-300 hover:bg-slate-100/60 hover:border-slate-300"
              )}
            >
              <option value="ALL">{locale === "ar" ? "الأولوية" : "Priority"}</option>
              {SUPPORT_PRIORITY_FILTERS.filter((priority) => priority !== "ALL").map((priority) => (
                <option key={priority} value={priority}>
                  {role === "admin"
                    ? tAdmin(`priorities.${priority}` as Parameters<typeof tAdmin>[0])
                    : t(`priorities.${priority}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            {role === "admin" ? (
              <label className="flex items-center gap-2 text-xs font-bold text-text-secondary dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={adminAssignedToMe}
                  onChange={(e) =>
                    updateListQuery({ assignedToMe: e.target.checked ? "true" : null, page: 1 })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/20 bg-white dark:bg-slate-950/20"
                />
                <span>{tAdmin("filters.assignedToMe")}</span>
              </label>
            ) : (
              <div />
            )}

            {supportHasActiveFilters && (
              <button
                onClick={() =>
                  updateListQuery({
                    status: null,
                    category: null,
                    priority: null,
                    assignedToMe: null,
                    page: 1,
                  })
                }
                className="text-[10px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 transition"
              >
                {locale === "ar" ? "إعادة تعيين" : "Reset"}
              </button>
            )}
          </div>
        </div>

        {/* Support items list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {supportQuery.isLoading ? (
            <div className="flex items-center justify-center p-8 text-xs text-text-muted animate-pulse font-semibold">
              {locale === "ar" ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : supportQuery.isError ? (
            <div className="p-4 text-center">
              <p className="text-xs text-rose-500 mb-2">{t("states.listError.note")}</p>
              <button
                onClick={() => supportQuery.refetch()}
                className="text-xs font-semibold text-primary underline"
              >
                {t("states.listError.retry")}
              </button>
            </div>
          ) : filteredSupportItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted font-medium">
              {t("states.empty.heading")}
            </div>
          ) : (
            filteredSupportItems.map((ticket) => (
              <ChatThreadListItem
                key={ticket.id}
                onClick={() => updateListQuery({ id: ticket.id })}
                thread={{
                  id: ticket.id,
                  title: ticket.subject,
                  subtitle:
                    role === "admin"
                      ? tAdmin(`categories.${ticket.category}` as Parameters<typeof tAdmin>[0])
                      : t(`categories.${ticket.category}` as Parameters<typeof t>[0]),
                  lastMessage:
                    locale === "ar" ? "اضغط لعرض المحادثة..." : "Click to view conversation...",
                  lastMessageAt: formatDateTime(ticket.lastMessageAt || ticket.createdAt, locale),
                  unreadCount: ticket.unreadCount,
                  isUnread: ticket.unreadCount > 0 || ticket.hasUnread === true,
                  readPending: readPendingThreadIds.includes(ticket.id),
                  lane: "support",
                  statusLabel:
                    role === "admin"
                      ? tAdmin(`statuses.${ticket.status}` as Parameters<typeof tAdmin>[0])
                      : t(`statuses.${ticket.status}` as Parameters<typeof t>[0]),
                  priorityLabel:
                    role === "admin"
                      ? tAdmin(`priorities.${ticket.priority}` as Parameters<typeof tAdmin>[0])
                      : t(`priorities.${ticket.priority}` as Parameters<typeof t>[0]),
                  isActive: ticket.id === activeSupportTicketId,
                }}
              />
            ))
          )}
        </div>

        {/* Support pagination */}
        {supportData && supportData.pagination.totalPages > 1 && (
          <div className="mt-auto p-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-text-muted bg-white dark:bg-transparent shrink-0">
            <button
              disabled={supportData.pagination.page <= 1}
              onClick={() => updateListQuery({ page: supportData.pagination.page - 1 })}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40"
            >
              {locale.startsWith("ar") ? "السابق" : "Prev"}
            </button>
            <span className="font-semibold">
              {supportData.pagination.page} / {supportData.pagination.totalPages}
            </span>
            <button
              disabled={supportData.pagination.page >= supportData.pagination.totalPages}
              onClick={() => updateListQuery({ page: supportData.pagination.page + 1 })}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40"
            >
              {locale.startsWith("ar") ? "التالي" : "Next"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // renderMode === "detail"
  return (
    <div className="h-full flex flex-col flex-1">
      {shouldOpenSupportCompose ? (
        <SupportLaneThread
          role={role}
          ticketId={null}
          fullViewHref={getMessagesPath(null, role, {
            lane: "support",
            relatedSessionId: relatedSessionId ?? undefined,
          })}
          locale={locale}
          prefillRelatedSessionId={relatedSessionId}
          copy={{
            heading: t("practitioner.thread.heading"),
            note: t("practitioner.thread.note"),
            empty: t("states.empty.heading"),
            loading: t("states.listError.note"),
            error: t("states.listError.note"),
            composerPlaceholder: t("reply.placeholder"),
            send: t("reply.submit"),
            createHeading: t("create.heading"),
            createNote: t("create.note"),
            createSubjectPlaceholder: t("create.placeholders.subject"),
            createMessagePlaceholder: t("create.placeholders.description"),
            createAction: t("create.submit"),
            creating: t("create.submitting"),
            openFull: t("practitioner.thread.heading"),
          }}
          onOpenFull={() => updateListQuery({ lane: "support" })}
          onCreatedTicket={(ticketId) =>
            updateListQuery({
              id: ticketId,
              relatedSessionId: null,
              page: 1,
            })
          }
        />
      ) : activeSupportTicketId ? (
        role === "patient" ? (
          <PatientSupportTicketScreen key={activeSupportTicketId} ticketId={activeSupportTicketId} />
        ) : role === "practitioner" ? (
          <PractitionerSupportTicketScreen key={activeSupportTicketId} ticketId={activeSupportTicketId} />
        ) : (
          <AdminSupportTicketScreen key={activeSupportTicketId} ticketId={activeSupportTicketId} />
        )
      ) : (
        <ChatEmptyState message={t("states.empty.heading")} />
      )}
    </div>
  );
}
