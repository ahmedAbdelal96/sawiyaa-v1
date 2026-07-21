"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ChatWorkspaceShell } from "@/components/shared/chat/ChatKit";
import {
  listCanonicalConversations,
  getCanonicalUnreadSummary,
  updateSupportTicketStatus,
  getAdminSupportTicket,
} from "@/features/messages-shell/api/messages-shell.api";
import UnifiedConversationThread from "./UnifiedConversationThread";
import SupportSafeContextPanel from "./SupportSafeContextPanel";
import NewSupportRequestModal from "./NewSupportRequestModal";
import type { CanonicalConversation } from "@/features/messages-shell/types/messages-shell.types";

// Icons
import { Search, PlusCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

type Props = {
  role: "patient" | "practitioner" | "admin";
};

export default function MessagesWorkspace({ role }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const isAr = locale.startsWith("ar");

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);
  const [isResolving, setIsResolving] = useState(false);

  // Active support queue filter tab (Admin only)
  // Default is NEEDS_SUPPORT_REPLY for admins
  const defaultAdminQueue = "NEEDS_SUPPORT_REPLY";
  const activeAdminQueue = searchParams.get("queue") || defaultAdminQueue;

  // Active selected conversation ID from URL
  const selectedId = searchParams.get("id") || null;

  // 1. Fetch conversations for Patient/Practitioner
  const conversationsQuery = useQuery({
    queryKey: ["canonical-conversations", role],
    queryFn: () => listCanonicalConversations({ page: 1, limit: 50 }),
    enabled: role !== "admin",
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // 1b. Fetch canonical support conversations for Admin. Queue state is derived
  // from the latest message and is not a SupportTicketStatus filter.
  const adminConversationsQuery = useQuery({
    queryKey: ["admin-canonical-conversations"],
    queryFn: () => listCanonicalConversations({ page: 1, limit: 50 }),
    enabled: role === "admin",
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // 1c. Resolve the canonical conversation ID for the selected support ticket (Admin only)
  const resolvedTicketQuery = useQuery({
    queryKey: ["admin-resolved-ticket", selectedId],
    queryFn: async () => {
      const result = await listCanonicalConversations({ page: 1, limit: 50 });
      const item = result.items.find(
        (conversation) =>
          conversation.supportTicketId === selectedId ||
          conversation.conversationId === selectedId,
      );

      if (!item) {
        const legacyResult = await getAdminSupportTicket(selectedId!);
        return { item: legacyResult.item };
      }

      return { item };
    },
    enabled: role === "admin" && Boolean(selectedId),
    staleTime: 30000,
  });

  // 2. Fetch unread summary for header/badges
  const unreadSummaryQuery = useQuery({
    queryKey: ["canonical-unread-summary", role],
    queryFn: () => getUnifiedMessagingUnreadSummaryWrapper(),
    staleTime: 10000,
  });

  async function getUnifiedMessagingUnreadSummaryWrapper() {
    try {
      return await getCanonicalUnreadSummary();
    } catch {
      return { unreadCount: 0, needsSupportReplyCount: 0, hasUnread: false };
    }
  }

  const conversations = useMemo(() => {
    if (role === "admin") {
      const tickets = (adminConversationsQuery.data?.items ?? []).filter(
        (conversation) => conversation.supportQueueState === activeAdminQueue,
      );
      return tickets.map((t) => ({
        id: t.supportTicketId ?? t.conversationId,
        conversationId: t.supportTicketId ?? t.conversationId,
        supportTicketId: t.supportTicketId,
        type: "SUPPORT" as const,
        title: t.subject || "Support Request",
        subject: t.subject || null,
        contextLabel: isAr ? "دعم" : "Support",
        contextId: t.supportTicketId ?? t.conversationId,
        status: t.status,
        isResolved: t.status === "RESOLVED",
        isReadOnly: t.status === "RESOLVED",
        canSend: t.status !== "RESOLVED",
        sendDisabledReason: t.status === "RESOLVED" ? "RESOLVED" : null,
        unreadCount: t.unreadCount,
        lastMessage: null,
        participants: [],
        otherParty: {
          userId: "user",
          displayName: isAr ? "مريض سويّة" : "Sawiyaa User",
          avatarUrl: null,
          publicRoleLabel: "Patient" as const,
        },
        supportQueueState: t.supportQueueState,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        lastActivityAt: t.lastActivityAt,
      }));
    }
    return conversationsQuery.data?.items ?? [];
  }, [role, adminConversationsQuery.data?.items, activeAdminQueue, conversationsQuery.data?.items, isAr]);

  // 3. Filter & Search logic
  const filteredConversations = useMemo(() => {
    let list = [...conversations];

    // Local Search filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        const otherPartyName = c.otherParty?.displayName || "";
        const subject = c.subject || "";
        const title = c.title || "";
        return (
          otherPartyName.toLowerCase().includes(q) ||
          subject.toLowerCase().includes(q) ||
          title.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [conversations, searchQuery]);

  // Determine selected conversation object
  const activeConversation = useMemo(() => {
    if (!selectedId) return null;
    if (role === "admin") {
      const details = resolvedTicketQuery.data?.item;
      if (!details) return null;
      return {
        id: details.conversationId,
        conversationId: details.conversationId,
        supportTicketId: details.id,
        type: "SUPPORT" as const,
        title: details.subject || "Support Request",
        subject: details.subject || null,
        contextLabel: isAr ? "دعم" : "Support",
        contextId: details.id,
        status: details.status,
        isResolved: details.status === "RESOLVED",
        isReadOnly: details.status === "RESOLVED",
        canSend: details.status !== "RESOLVED",
        sendDisabledReason: details.status === "RESOLVED" ? "RESOLVED" : null,
        unreadCount: 0,
        lastMessage: null,
        participants: [],
        otherParty: {
          userId: "user",
          displayName: isAr ? "مريض سويّة" : "Sawiyaa User",
          avatarUrl: null,
          publicRoleLabel: "Patient" as const,
        },
        supportQueueState: details.status as any,
        createdAt: details.createdAt,
        updatedAt: details.createdAt,
        lastActivityAt: details.createdAt,
      };
    }
    return (
      conversations.find(
        (c) =>
          c.conversationId === selectedId ||
          c.supportTicketId === selectedId ||
          (c.type === "SESSION" && c.contextId === selectedId) ||
          (c.type === "CARE" && c.contextId === selectedId)
      ) || null
    );
  }, [conversations, selectedId, role, resolvedTicketQuery.data, isAr]);

  const updateActiveConversationUrl = useCallback((id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("id", id);
    } else {
      params.delete("id");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  // Restore last selected conversation ID on initial mount if not already present in searchParams
  useEffect(() => {
    if (selectedId) return;
    const key = `sawiyaa_last_msg_conv_${role}`;
    const lastId = localStorage.getItem(key);
    if (lastId && conversations.some((c) => c.conversationId === lastId)) {
      updateActiveConversationUrl(lastId);
    } else if (conversations.length > 0 && role !== "admin") {
      // Auto-select latest for patients/practitioners
      updateActiveConversationUrl(conversations[0].conversationId);
    }
  }, [conversations, selectedId, role, updateActiveConversationUrl]);

  // Save selected ID to localStorage
  useEffect(() => {
    if (selectedId) {
      localStorage.setItem(`sawiyaa_last_msg_conv_${role}`, selectedId);
    }
  }, [selectedId, role]);

  // Keep URL updated with the canonical conversationId if it was resolved from a domain ID
  useEffect(() => {
    if (role !== "admin" && activeConversation && selectedId && selectedId !== activeConversation.conversationId) {
      updateActiveConversationUrl(activeConversation.conversationId);
    }
  }, [role, activeConversation, selectedId, updateActiveConversationUrl]);



  const handleQueueChange = (queue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("queue", queue);
    params.delete("id"); // clear active conversation when switching queues
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Support ticket resolution handler
  const handleResolveSupport = async () => {
    if (!activeConversation?.supportTicketId || isResolving) return;

    try {
      setIsResolving(true);
      await updateSupportTicketStatus(activeConversation.supportTicketId, "RESOLVED");
      void queryClient.invalidateQueries({ queryKey: ["canonical-conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-canonical-conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["canonical-unread-summary"] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsResolving(false);
    }
  };

  const listQueryLoading = role === "admin" ? adminConversationsQuery.isLoading : conversationsQuery.isLoading;
  const listQueryError = role === "admin" ? adminConversationsQuery.isError : conversationsQuery.isError;
  const isThreadLoading = role === "admin" && Boolean(selectedId) ? resolvedTicketQuery.isLoading : false;

  const showDetailPane = Boolean(selectedId);

  return (
    <section className="h-full min-h-0 w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <ChatWorkspaceShell>
        <div className="flex h-full w-full min-h-0 overflow-hidden">
          {/* 1. Left Conversation List Sidebar */}
          <div
            className={cn(
              "h-full flex flex-col min-h-0 overflow-hidden border-e border-border-light/80 dark:border-white/10 bg-white dark:bg-slate-900/10 shrink-0 w-full lg:w-[360px]",
              showDetailPane ? "hidden lg:flex" : "flex"
            )}
          >
            {/* Search and Action Header */}
            <div className="p-3 border-b border-border-light/80 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-text-primary dark:text-white">
                  {isAr ? "الرسائل الموحدة" : "Unified Messages"}
                </h2>
                {role !== "admin" && (
                  <button
                    onClick={() => setIsSupportModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                    aria-label={isAr ? "طلب دعم جديد" : "New support request"}
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>{isAr ? "تواصل مع الدعم" : "Contact Support"}</span>
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative flex items-center rounded-xl bg-slate-100 dark:bg-white/5 border dark:border-white/10 px-3">
                <Search className="h-4 w-4 text-text-muted shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? "البحث بالاسم أو العنوان..." : "Search by name or subject..."}
                  className="w-full bg-transparent border-0 outline-none px-2 py-2 text-xs text-text-primary dark:text-white dark:placeholder-white/40"
                />
              </div>

              {/* Admin Queue Tabs */}
              {role === "admin" && (
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-white/5 p-1">
                  {[
                    { key: "NEEDS_SUPPORT_REPLY", label: isAr ? "تحتاج إلى رد" : "Needs reply" },
                    { key: "WAITING_FOR_USER", label: isAr ? "في انتظار المستخدم" : "Waiting" },
                    { key: "RESOLVED", label: isAr ? "تم الحل" : "Resolved" },
                  ].map((tab) => {
                    const isActive = activeAdminQueue === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => handleQueueChange(tab.key)}
                        className={cn(
                          "py-1.5 rounded-lg text-[10px] font-bold text-center transition-all",
                          isActive
                            ? "bg-teal-600 text-white shadow-sm"
                            : "text-text-secondary dark:text-slate-400 hover:text-text-primary"
                        )}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-slate-50/50 dark:bg-slate-950/20">
              {listQueryLoading ? (
                <div className="flex items-center justify-center p-8 text-xs text-text-muted animate-pulse font-semibold">
                  {isAr ? "جاري التحميل..." : "Loading..."}
                </div>
              ) : listQueryError ? (
                <div className="p-4 text-center space-y-2">
                  <AlertCircle className="h-6 w-6 text-rose-500 mx-auto" />
                  <p className="text-xs text-rose-500 font-semibold">
                    {isAr ? "تعذر تحميل المحادثات" : "Could not load conversations"}
                  </p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted font-medium">
                  {isAr ? "لا توجد محادثات مطابقة لبحثك." : "No conversations match your search."}
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isActive = c.conversationId === selectedId;
                  const isUnread = c.unreadCount > 0;
                  const badgeColor =
                    c.type === "SESSION"
                      ? "bg-teal-500/10 text-teal-600 dark:bg-teal-500/25 dark:text-teal-400"
                      : c.type === "CARE"
                      ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/25 dark:text-indigo-400"
                      : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400";

                  return (
                    <button
                      key={c.conversationId}
                      onClick={() => updateActiveConversationUrl(c.conversationId)}
                      className={cn(
                        "relative w-full rounded-2xl border p-3 text-start transition-all duration-200 flex items-start justify-between gap-3",
                        isActive
                          ? "border-teal-600/50 bg-teal-500/5 shadow-sm ring-1 ring-teal-500/20 dark:border-teal-500/30"
                          : "border-border-light/60 bg-white hover:border-teal-500/30 dark:border-white/5 dark:bg-slate-900"
                      )}
                    >
                      {/* Active Indicator on the Inner Divider Edge (Right edge for RTL, Left edge for LTR) */}
                      {isActive && (
                        <span className={cn(
                          "absolute top-0 bottom-0 w-1.5 bg-teal-600 rounded-full",
                          isAr ? "-left-[1px]" : "-right-[1px]"
                        )} />
                      )}

                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-600/10 to-teal-600/5 text-xs font-bold text-teal-700 ring-1 ring-teal-600/25 dark:text-teal-400">
                          {c.otherParty?.displayName?.charAt(0).toUpperCase() || "U"}
                        </span>
                        <div className="min-w-0">
                          <p className={cn(
                            "truncate text-xs font-bold text-text-primary dark:text-white/95",
                            isUnread && "font-extrabold"
                          )}>
                            {c.title}
                          </p>
                          <p className="mt-1 line-clamp-1 text-[11px] text-text-secondary dark:text-white/60">
                            {c.lastMessage?.body || (isAr ? "لا توجد رسائل" : "No messages")}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase", badgeColor)}>
                              {c.type === "SESSION" ? (isAr ? "جلسة" : "Session") : c.type === "CARE" ? (isAr ? "متابعة" : "Care") : (isAr ? "دعم" : "Support")}
                            </span>
                            {c.isResolved && (
                              <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[9px] font-bold text-text-muted">
                                {isAr ? "محلولة" : "Resolved"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1 text-[10px] text-text-muted">
                        {isUnread && (
                          <span className="inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[9px] font-bold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Middle Detail Chat Panel */}
          <div
            className={cn(
              "h-full flex flex-col flex-1 min-w-0 overflow-hidden bg-white dark:bg-slate-900/20",
              showDetailPane ? "flex" : "hidden lg:flex"
            )}
          >
            {showDetailPane ? (
              <div className="flex-1 flex min-h-0 overflow-hidden relative">
                {/* Back button for mobile/tablet portrait */}
                <div className="absolute top-2 start-2 lg:hidden z-10">
                  <button
                    onClick={() => updateActiveConversationUrl(null)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-text-secondary hover:text-text-primary focus:outline-none"
                    aria-label={isAr ? "رجوع" : "Back"}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  {isThreadLoading ? (
                    <div className="flex-1 flex items-center justify-center text-text-muted animate-pulse font-semibold text-xs">
                      <span>{isAr ? "جاري تحميل تفاصيل المحادثة..." : "Loading conversation details..."}</span>
                    </div>
                  ) : activeConversation ? (
                    <UnifiedConversationThread
                      conversation={activeConversation}
                      role={role}
                      locale={locale}
                      onNewSupportClick={role !== "admin" ? () => setIsSupportModalOpen(true) : undefined}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-text-muted font-semibold text-sm">
                      {isAr ? "تعذر تحميل تفاصيل المحادثة" : "Could not load conversation details"}
                    </div>
                  )}
                </div>

                {/* 3. Right Safe Operations Panel (Admin Support only) */}
                {role === "admin" && isContextPanelOpen && activeConversation && (
                  <SupportSafeContextPanel
                    conversation={activeConversation}
                    onResolve={handleResolveSupport}
                    isResolving={isResolving}
                  />
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-muted font-semibold text-sm">
                {isAr ? "اختر محادثة لعرض التفاصيل" : "Select a conversation to view details"}
              </div>
            )}
          </div>
        </div>
      </ChatWorkspaceShell>

      {/* Support Creation Modal */}
      {role !== "admin" && (
        <NewSupportRequestModal
          isOpen={isSupportModalOpen}
          onClose={() => setIsSupportModalOpen(false)}
          role={role === "patient" ? "patient" : "practitioner"}
          locale={locale}
          onSuccess={async (conversationIdOrTicketId) => {
            await queryClient.invalidateQueries({ queryKey: ["canonical-conversations"] });
            const freshData = await queryClient.fetchQuery({
              queryKey: ["canonical-conversations", role],
              queryFn: () => listCanonicalConversations({ page: 1, limit: 50 }),
            });
            const freshItems = freshData?.items ?? [];
            const matched = freshItems.find(
              (c) =>
                c.conversationId === conversationIdOrTicketId ||
                c.supportTicketId === conversationIdOrTicketId
            );
            if (matched) {
              updateActiveConversationUrl(matched.conversationId);
            } else {
              updateActiveConversationUrl(conversationIdOrTicketId);
            }
          }}
        />
      )}
    </section>
  );
}
