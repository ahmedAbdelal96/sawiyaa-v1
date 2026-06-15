"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChatThreadListItem, ChatEmptyState } from "@/components/shared/chat/ChatKit";
import { getPatientSessions, getPractitionerSessions } from "@/features/sessions/api/sessions.api";
import SessionChatPanel from "@/features/chat/components/SessionChatPanel";
import { formatDateTime } from "./messages-workspace.utils";
import type { LaneWorkspaceProps } from "./messages-workspace.types";

export default function SessionLaneWorkspace({
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

  const sessionQuery = useQuery({
    queryKey: ["messages-workspace", role, "sessions", page, limit],
    queryFn: async () => {
      if (role === "patient") {
        return getPatientSessions({ page, limit });
      }
      if (role === "practitioner") {
        return getPractitionerSessions({ page, limit });
      }
      return { items: [], pagination: { page, limit, totalItems: 0, totalPages: 0 } };
    },
    enabled: role !== "admin" && renderMode === "list",
    staleTime: 30_000,
  });

  const sessionData = sessionQuery.data;
  const sessionItems = useMemo(() => {
    const items = sessionData?.items ?? [];
    // Filter sessions where chat is allowed
    const chatAllowedItems = items.filter((item) => item.chatAvailability?.canRead === true);

    if (!searchQuery.trim()) return chatAllowedItems;
    const q = searchQuery.toLowerCase();
    return chatAllowedItems.filter((item) => {
      const counterpartName = isPatient
        ? item.practitioner?.displayName
        : item.patient?.displayName;
      return (
        counterpartName?.toLowerCase().includes(q) ||
        item.sessionCode.toLowerCase().includes(q)
      );
    });
  }, [sessionData?.items, searchQuery, isPatient]);

  const activeSessionId = selectedId || sessionItems[0]?.id || null;

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

  // Set readPending only if session is actually unread
  useEffect(() => {
    if (activeSessionId && sessionItems) {
      const item = sessionItems.find((s) => s.id === activeSessionId);
      if (item) {
        const isActuallyUnread = (item.unreadCount && item.unreadCount > 0) || item.hasUnread === true;
        if (isActuallyUnread) {
          setReadPendingThreadIds((prev) => {
            if (prev.includes(activeSessionId)) return prev;
            return [...prev, activeSessionId];
          });
        }
      }
    }
  }, [activeSessionId, sessionItems]);

  if (renderMode === "list") {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {sessionQuery.isLoading ? (
            <div className="flex items-center justify-center p-8 text-xs text-text-muted animate-pulse font-semibold">
              {locale === "ar" ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : sessionQuery.isError ? (
            <div className="p-4 text-center">
              <p className="text-xs text-rose-500 mb-2">
                {locale === "ar" ? "تعذر تحميل الجلسات" : "Could not load sessions"}
              </p>
              <button
                onClick={() => sessionQuery.refetch()}
                className="text-xs font-semibold text-primary underline"
              >
                {locale === "ar" ? "إعادة المحاولة" : "Retry"}
              </button>
            </div>
          ) : sessionItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted font-medium">
              {locale === "ar"
                ? "لا توجد محادثات جلسات نشطة حالياً."
                : "No active session chats found."}
            </div>
          ) : (
            sessionItems.map((item) => {
              const displayTitle = isPatient
                ? item.practitioner?.displayName ?? (locale === "ar" ? "معالج" : "Practitioner")
                : item.patient?.displayName ?? (locale === "ar" ? "مريض" : "Patient");

              return (
                <ChatThreadListItem
                  key={item.id}
                  onClick={() => updateListQuery({ id: item.id })}
                  thread={{
                    id: item.id,
                    title: displayTitle,
                    subtitle: `Session #${item.sessionCode}`,
                    lastMessage:
                      locale === "ar" ? "اضغط لعرض المحادثة..." : "Click to view conversation...",
                    lastMessageAt: formatDateTime(item.scheduledStartAt, locale),
                    unreadCount: item.unreadCount ?? 0,
                    isUnread: (item.unreadCount ?? 0) > 0 || item.hasUnread === true,
                    readPending: readPendingThreadIds.includes(item.id),
                    lane: "session",
                    statusLabel: item.presentationStatus.replaceAll("_", " "),
                    isActive: item.id === activeSessionId,
                  }}
                />
              );
            })
          )}
        </div>

        {/* Session pagination */}
        {sessionData && sessionData.pagination.totalPages > 1 && (
          <div className="mt-auto p-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-text-muted bg-white dark:bg-transparent shrink-0">
            <button
              disabled={sessionData.pagination.page <= 1}
              onClick={() => updateListQuery({ page: sessionData.pagination.page - 1 })}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40"
            >
              {locale.startsWith("ar") ? "السابق" : "Prev"}
            </button>
            <span className="font-semibold">
              {sessionData.pagination.page} / {sessionData.pagination.totalPages}
            </span>
            <button
              disabled={sessionData.pagination.page >= sessionData.pagination.totalPages}
              onClick={() => updateListQuery({ page: sessionData.pagination.page + 1 })}
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
  if (role === "admin") {
    return (
      <ChatEmptyState
        message={locale === "ar" ? "محادثات الجلسات غير متاحة للإدارة." : "Session chat is not available for admin."}
      />
    );
  }

  return (
    <div className="h-full flex flex-col flex-1">
      {activeSessionId ? (
        <SessionChatPanel
          key={activeSessionId}
          sessionId={activeSessionId}
          scope={isPatient ? "patient" : "practitioner"}
          variant="embedded"
        />
      ) : (
        <ChatEmptyState
          message={locale === "ar" ? "لا توجد جلسات محددة." : "No session selected."}
        />
      )}
    </div>
  );
}
