"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChatThreadListItem, ChatEmptyState } from "@/components/shared/chat/ChatKit";
import {
  getPatientCareChatRequests,
  getPractitionerCareChatRequests,
  getAdminCareChatRequests,
} from "@/features/care-chat/api/care-chat.api";
import CareChatConversationPanel from "@/features/care-chat/components/CareChatConversationPanel";
import { formatDateTime, mapCareStatus } from "./messages-workspace.utils";
import type { LaneWorkspaceProps } from "./messages-workspace.types";

export default function CareLaneWorkspace({
  role,
  locale,
  selectedId,
  page,
  limit,
  updateListQuery,
  searchQuery,
  renderMode,
}: LaneWorkspaceProps & { renderMode: "list" | "detail" }) {
  const isPatient = role === "patient";

  const careQuery = useQuery({
    queryKey: ["messages-workspace", role, "care-chat", page, limit],
    queryFn: async () => {
      if (role === "patient") {
        return getPatientCareChatRequests({ page, limit });
      }
      if (role === "practitioner") {
        return getPractitionerCareChatRequests({ page, limit });
      }
      return getAdminCareChatRequests({ page, limit });
    },
    enabled: renderMode === "list",
    staleTime: 30_000,
  });

  const careData = careQuery.data;
  const careItems = useMemo(() => {
    const items = careData?.items ?? [];
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const counterpartName = isPatient
        ? item.practitioner?.displayName
        : item.patient?.displayName;
      return (
        counterpartName?.toLowerCase().includes(q) ||
        item.reason?.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [careData?.items, searchQuery, isPatient]);

  // Try to find matching care request item to resolve linkedConversationId
  const activeCareItem = useMemo(() => {
    if (!selectedId) return careItems[0] || null;
    return (
      careItems.find(
        (item) => item.id === selectedId || item.linkedConversationId === selectedId,
      ) || null
    );
  }, [careItems, selectedId]);

  const activeCareId = activeCareItem?.id || selectedId;
  const activeConversationId = activeCareItem
    ? activeCareItem.linkedConversationId
    : selectedId;

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

  // Set readPending only if row is actually unread and has an active conversation
  useEffect(() => {
    if (activeCareId && activeConversationId && careItems) {
      const item = careItems.find((i) => i.id === activeCareId || i.linkedConversationId === activeCareId);
      if (item) {
        const isActuallyUnread = item.unreadCount > 0 || item.hasUnread === true;
        if (isActuallyUnread) {
          setReadPendingThreadIds((prev) => {
            if (prev.includes(activeCareId)) return prev;
            return [...prev, activeCareId];
          });
        }
      }
    }
  }, [activeCareId, activeConversationId, careItems]);

  if (renderMode === "list") {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {careQuery.isLoading ? (
            <div className="flex items-center justify-center p-8 text-xs text-text-muted animate-pulse font-semibold">
              {locale === "ar" ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : careQuery.isError ? (
            <div className="p-4 text-center">
              <p className="text-xs text-rose-500 mb-2">
                {locale === "ar" ? "تعذر تحميل المحادثات" : "Could not load conversations"}
              </p>
              <button
                onClick={() => careQuery.refetch()}
                className="text-xs font-semibold text-primary underline"
              >
                {locale === "ar" ? "إعادة المحاولة" : "Retry"}
              </button>
            </div>
          ) : careItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted font-medium">
              {locale === "ar"
                ? "لا توجد طلبات رعاية نشطة حالياً."
                : "No active care requests found."}
            </div>
          ) : (
            careItems.map((item) => {
              const displayTitle = isPatient
                ? item.practitioner?.displayName ?? (locale === "ar" ? "معالج" : "Practitioner")
                : item.patient?.displayName ?? (locale === "ar" ? "مريض" : "Patient");

              const subtitle =
                role === "admin"
                  ? `${item.patient?.displayName ?? "Patient"} - ${item.practitioner?.displayName ?? "Practitioner"}`
                  : item.reason ??
                    (locale === "ar" ? "محادثة متابعة الرعاية" : "Follow-up care conversation");

              return (
                <ChatThreadListItem
                  key={item.id}
                  onClick={() => updateListQuery({ id: item.id })}
                  thread={{
                    id: item.id,
                    title: displayTitle,
                    subtitle,
                    lastMessage:
                      locale === "ar" ? "اضغط لعرض المحادثة..." : "Click to view conversation...",
                    lastMessageAt: formatDateTime(item.requestedAt, locale),
                    unreadCount: item.unreadCount ?? 0,
                    isUnread: item.unreadCount > 0 || item.hasUnread === true,
                    readPending: readPendingThreadIds.includes(item.id),
                    lane: "care",
                    statusLabel: mapCareStatus(item.status, locale),
                    isActive: item.id === activeCareId,
                  }}
                />
              );
            })
          )}
        </div>

        {/* Care pagination */}
        {careData && careData.pagination.totalPages > 1 && (
          <div className="mt-auto p-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-text-muted bg-white dark:bg-transparent shrink-0">
            <button
              disabled={careData.pagination.page <= 1}
              onClick={() => updateListQuery({ page: careData.pagination.page - 1 })}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40"
            >
              {locale.startsWith("ar") ? "السابق" : "Prev"}
            </button>
            <span className="font-semibold">
              {careData.pagination.page} / {careData.pagination.totalPages}
            </span>
            <button
              disabled={careData.pagination.page >= careData.pagination.totalPages}
              onClick={() => updateListQuery({ page: careData.pagination.page + 1 })}
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
  if (!activeCareId) {
    return (
      <ChatEmptyState
        message={locale === "ar" ? "لا توجد طلبات رعاية محددة." : "No care request selected."}
      />
    );
  }

  if (!activeConversationId) {
    // Show pending state notice if care request exists but conversation is not active yet
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 text-center shadow-sm min-h-[400px]">
        <div className="rounded-2xl border border-border-light bg-surface-tertiary px-5 py-4 text-xs leading-6 text-text-secondary dark:bg-white/5 max-w-md">
          <p className="font-semibold text-text-primary dark:text-white/90 text-sm">
            {locale === "ar" ? "الطلب قيد المراجعة" : "Request is pending"}
          </p>
          <p className="mt-2 text-text-muted">
            {locale === "ar"
              ? "الطلب قيد المراجعة وسيظهر هنا بعد التفعيل."
              : "Request is pending and will appear here after activation."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col flex-1">
      <CareChatConversationPanel
        key={activeConversationId}
        conversationId={activeConversationId}
        scope={role}
        backHref={`/${locale}/${role}/messages?lane=care`}
        variant="embedded"
      />
    </div>
  );
}
