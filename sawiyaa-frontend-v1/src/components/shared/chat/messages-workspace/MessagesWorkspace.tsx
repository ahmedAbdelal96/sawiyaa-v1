"use client";

import { useState, useMemo, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ChatWorkspaceShell, ChatThreadList } from "@/components/shared/chat/ChatKit";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { getUnifiedMessagingUnreadSummary } from "@/features/messages-shell/api/messages-shell.api";
import { buildUpdatedSearchParams, parsePositiveIntParam } from "@/components/ui/data-table";

// Icons
import { LifeBuoy, Video, HeartHandshake } from "lucide-react";

// Workspaces & Types
import type { MessageLane } from "./messages-workspace.types";
import SupportLaneWorkspace from "./SupportLaneWorkspace";
import SessionLaneWorkspace from "./SessionLaneWorkspace";
import CareLaneWorkspace from "./CareLaneWorkspace";

type Props = {
  role: "patient" | "practitioner" | "admin";
};

export default function MessagesWorkspace({ role }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handler = () => {
      void queryClient.invalidateQueries({
        queryKey: ["unified-messages-shell"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["messages-workspace"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["support"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["practitioner-support"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin-support"],
      });
    };

    window.addEventListener("unified-messages:unread-summary:dirty", handler);
    return () => {
      window.removeEventListener("unified-messages:unread-summary:dirty", handler);
    };
  }, [queryClient]);

  // 1. Unread count query
  const unreadSummaryQuery = useQuery({
    queryKey: ["unified-messages-shell", role, "unread-summary"],
    queryFn: () => getUnifiedMessagingUnreadSummary(),
    staleTime: 15_000,
    refetchInterval: 20_000,
  });

  const sessionUnread = unreadSummaryQuery.data?.item?.session.unreadMessages ?? 0;
  const careUnread = unreadSummaryQuery.data?.item?.practitioner.unreadMessages ?? 0;
  const supportUnread = unreadSummaryQuery.data?.item?.support.unreadMessages ?? 0;

  // 2. Define supported lanes per role
  const lanes = useMemo(() => {
    const counts = {
      session: role === "admin" ? 0 : sessionUnread,
      care: careUnread,
      support: supportUnread,
    };

    const sessionTab = {
      key: "session" as MessageLane,
      label: locale === "ar" ? "محادثة الجلسة" : "Session Chat",
      icon: <Video className="h-4 w-4" />,
      unreadCount: counts.session,
    };
    const careTab = {
      key: "care" as MessageLane,
      label: locale === "ar" ? "محادثة الرعاية" : "Care Chat",
      icon: <HeartHandshake className="h-4 w-4" />,
      unreadCount: counts.care,
    };
    const supportTab = {
      key: "support" as MessageLane,
      label: locale === "ar" ? "الدعم" : "Support",
      icon: <LifeBuoy className="h-4 w-4" />,
      unreadCount: counts.support,
    };

    if (role === "admin") {
      return [supportTab, careTab];
    }
    if (role === "patient") {
      return [sessionTab, careTab, supportTab];
    }
    // practitioner
    return [careTab, sessionTab, supportTab];
  }, [role, locale, sessionUnread, careUnread, supportUnread]);

  // 3. Resolve active lane
  const rawLane = searchParams.get("lane") || "support";
  let activeLane = (rawLane === "followup" ? "care" : rawLane) as MessageLane;

  const isAllowed = lanes.some((l) => l.key === activeLane);
  if (!isAllowed) {
    activeLane = lanes[0]?.key || "support";
  }

  // 4. Resolve selected ID (supporting aliases)
  const selectedId =
    searchParams.get("id") ||
    searchParams.get("ticketId") ||
    searchParams.get("sessionId") ||
    searchParams.get("threadId") ||
    searchParams.get("conversationId") ||
    null;
  const relatedSessionId = searchParams.get("relatedSessionId") || null;
  const shouldOpenSupportCompose =
    activeLane === "support" && Boolean(relatedSessionId) && !selectedId;
  const showDetailPane = Boolean(selectedId) || shouldOpenSupportCompose;

  // 5. Helpers bound to URL state
  const page = parsePositiveIntParam(searchParams.get("page"), 1, { min: 1 });
  const limit = parsePositiveIntParam(searchParams.get("limit"), DEFAULT_PAGE_LIMIT, {
    min: 1,
    max: 40,
  });

  const updateListQuery = (updates: Record<string, string | number | null | undefined>) => {
    const next = buildUpdatedSearchParams(new URLSearchParams(searchParams.toString()), updates);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <section className="h-full min-h-0 w-full overflow-hidden">
      <ChatWorkspaceShell>
        {/* Left Thread List Column */}
        <div
          className={cn(
            "h-full flex flex-col min-h-0 overflow-hidden",
            showDetailPane ? "hidden lg:flex lg:w-[380px] lg:shrink-0" : "w-full flex lg:w-[380px] lg:shrink-0"
          )}
        >
          <ChatThreadList
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={locale === "ar" ? "البحث..." : "Search..."}
            header={
              <div className="pb-3 border-b border-slate-100 dark:border-white/5 space-y-3">
                {/* Lane Navigation Tabs */}
                {lanes.length > 1 && (
                  <div className={cn(
                    "grid gap-1 rounded-xl bg-gray-50 dark:bg-white/5 p-1 ring-1 ring-slate-200/50 dark:ring-white/10 shrink-0",
                    lanes.length === 2 ? "grid-cols-2" : "grid-cols-3"
                  )}>
                    {lanes.map((lane) => {
                      const isActive = lane.key === activeLane;
                      return (
                        <button
                          key={lane.key}
                          type="button"
                          onClick={() => {
                            updateListQuery({
                              lane: lane.key,
                              id: null,
                              ticketId: null,
                              sessionId: null,
                              threadId: null,
                              conversationId: null,
                              page: 1,
                              status: null,
                              category: null,
                              priority: null,
                              assignedToMe: null,
                            });
                            setSearchQuery("");
                          }}
                          className={cn(
                            "relative inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all duration-200",
                            isActive
                              ? "bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-sm"
                              : "text-text-secondary dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-text-primary"
                          )}
                        >
                          {lane.icon}
                          <span className="truncate">{lane.label}</span>
                          {lane.unreadCount > 0 && (
                            <span className="inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white shrink-0">
                              {lane.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            }
          >
            {/* List renders based on active lane */}
            {activeLane === "support" && (
              <SupportLaneWorkspace
                role={role}
                locale={locale}
                selectedId={selectedId}
                relatedSessionId={relatedSessionId}
                page={page}
                limit={limit}
                updateListQuery={updateListQuery}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                renderMode="list"
              />
            )}
            {activeLane === "session" && (
              <SessionLaneWorkspace
                role={role}
                locale={locale}
                selectedId={selectedId}
                page={page}
                limit={limit}
                updateListQuery={updateListQuery}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                renderMode="list"
              />
            )}
            {activeLane === "care" && (
              <CareLaneWorkspace
                role={role}
                locale={locale}
                selectedId={selectedId}
                page={page}
                limit={limit}
                updateListQuery={updateListQuery}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                renderMode="list"
              />
            )}
          </ChatThreadList>
        </div>

        {/* Right Conversation Panel / Detail Column */}
        <div
          className={cn("h-full flex flex-col flex-1", showDetailPane ? "w-full flex" : "hidden lg:flex")}
        >
          {activeLane === "support" && (
            <SupportLaneWorkspace
              role={role}
              locale={locale}
              selectedId={selectedId}
              relatedSessionId={relatedSessionId}
              page={page}
              limit={limit}
              updateListQuery={updateListQuery}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              renderMode="detail"
            />
          )}
          {activeLane === "session" && (
            <SessionLaneWorkspace
              role={role}
              locale={locale}
              selectedId={selectedId}
              page={page}
              limit={limit}
              updateListQuery={updateListQuery}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              renderMode="detail"
            />
          )}
          {activeLane === "care" && (
            <CareLaneWorkspace
              role={role}
              locale={locale}
              selectedId={selectedId}
              page={page}
              limit={limit}
              updateListQuery={updateListQuery}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              renderMode="detail"
            />
          )}
        </div>
      </ChatWorkspaceShell>
    </section>
  );
}
