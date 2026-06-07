"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminCareChatRequests,
  getPatientCareChatRequests,
  getPractitionerCareChatRequests,
} from "@/features/care-chat/api/care-chat.api";
import type {
  CareChatRequestItem,
  CareChatRequestStatus,
} from "@/features/care-chat/types/care-chat.types";
import {
  getPatientSessions,
  getPractitionerSessions,
} from "@/features/sessions/api/sessions.api";
import type {
  SessionListItem,
  SessionPresentationStatus,
} from "@/features/sessions/types/sessions.types";
import {
  getAdminSupportTickets,
  getPatientSupportTickets,
  getPractitionerSupportTickets,
} from "@/features/support/api/support.api";
import { getUnifiedMessagingUnreadSummary } from "../api/messages-shell.api";
import type {
  SupportTicketStatus,
  SupportTicketSummary,
} from "@/features/support/types/support.types";
import type {
  UnifiedMessagingLane,
  UnifiedMessagingLaneSnapshot,
  UnifiedMessagingRole,
  UnifiedMessagingUnreadSummary,
  UnifiedSessionChatStatus,
  UnifiedSessionSignal,
} from "../types/messages-shell.types";

type UseUnifiedMessagingShellResult = {
  sessionLane: UnifiedMessagingLaneSnapshot;
  practitionerLane: UnifiedMessagingLaneSnapshot;
  supportLane: UnifiedMessagingLaneSnapshot;
  unreadLikeCount: number;
  sessionSignal: UnifiedSessionSignal;
};

function mapCareStatus(status: CareChatRequestStatus) {
  if (status === "PENDING") return "Pending";
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  if (status === "EXPIRED") return "Expired";
  if (status === "REVOKED") return "Revoked";
  return "Cancelled";
}

function mapSupportStatus(status: SupportTicketStatus) {
  if (status === "OPEN") return "Open";
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "WAITING_FOR_USER") return "Waiting for you";
  if (status === "ESCALATED") return "Escalated";
  if (status === "RESOLVED") return "Resolved";
  return "Closed";
}

function buildSessionHref(role: UnifiedMessagingRole, sessionId: string) {
  if (role === "patient") {
    return `/patient/sessions/${sessionId}/chat`;
  }
  if (role === "practitioner") {
    return `/practitioner/sessions/${sessionId}/chat`;
  }
  return "/admin/sessions";
}

function buildCareHref(role: UnifiedMessagingRole, requestId: string) {
  if (role === "patient") {
    return `/patient/care-chat/${requestId}`;
  }
  if (role === "practitioner") {
    return `/practitioner/care-chat/${requestId}`;
  }
  return `/admin/care-chat/${requestId}`;
}

function buildSupportHref(role: UnifiedMessagingRole, ticketId: string) {
  if (role === "patient") {
    return `/patient/support/${ticketId}`;
  }
  if (role === "practitioner") {
    return `/practitioner/support/${ticketId}`;
  }
  return `/admin/support/${ticketId}`;
}

function buildSessionRootHref(role: UnifiedMessagingRole) {
  if (role === "patient") return "/patient/sessions";
  if (role === "practitioner") return "/practitioner/sessions";
  return "/admin/sessions";
}

function buildCareRootHref(role: UnifiedMessagingRole) {
  if (role === "patient") return "/patient/care-chat";
  if (role === "practitioner") return "/practitioner/care-chat";
  return "/admin/care-chat";
}

function buildSupportRootHref(role: UnifiedMessagingRole) {
  if (role === "patient") return "/patient/support";
  if (role === "practitioner") return "/practitioner/support";
  return "/admin/support";
}

function getSessionPriority(status: SessionPresentationStatus) {
  if (status === "IN_PROGRESS") return 3;
  if (status === "JOINABLE") return 2;
  if (status === "COMPLETED" || status === "ENDED" || status === "CANCELLED") return 1;
  return 0;
}

function mapSessionChatStatus(status: SessionPresentationStatus): UnifiedSessionChatStatus {
  if (status === "JOINABLE") return "READY_TO_JOIN";
  if (status === "IN_PROGRESS") return "IN_PROGRESS";
  return "COMPLETED";
}

export function useUnifiedMessagingShell(
  role: UnifiedMessagingRole,
  options?: {
    laneDataEnabled?: boolean;
    activeLane?: UnifiedMessagingLane;
    suppressSupportLaneFetch?: boolean;
  },
): UseUnifiedMessagingShellResult & {
  sessionRootHref: string;
  practitionerRootHref: string;
  supportRootHref: string;
} {
  const [isPageVisible, setIsPageVisible] = useState(
    () => (typeof document === "undefined" ? true : document.visibilityState === "visible"),
  );
  const queryClient = useQueryClient();

  const laneDataEnabled = options?.laneDataEnabled ?? true;
  const activeLane = options?.activeLane;
  const suppressSupportLaneFetch = options?.suppressSupportLaneFetch ?? false;
  const shouldFetchLaneData = laneDataEnabled && isPageVisible;
  const shouldFetchSupportLaneData = shouldFetchLaneData && !suppressSupportLaneFetch;
  const dirtyRefreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const onVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const unreadSummaryQueryKey = useMemo(
    () => ["unified-messages-shell", role, "unread-summary"] as const,
    [role],
  );

  const sessionQuery = useQuery({
    queryKey: ["unified-messages-shell", role, "sessions"],
    queryFn: async () => {
      if (role === "patient") {
        return getPatientSessions({ page: 1, limit: 8 });
      }
      if (role === "practitioner") {
        return getPractitionerSessions({ page: 1, limit: 8 });
      }
      return { items: [], pagination: { page: 1, limit: 8, totalItems: 0, totalPages: 0 } };
    },
    enabled: role !== "admin" && shouldFetchLaneData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const practitionerQuery = useQuery({
    queryKey: ["unified-messages-shell", role, "care-chat"],
    queryFn: async () => {
      if (role === "patient") {
        return getPatientCareChatRequests({ page: 1, limit: 6 });
      }
      if (role === "practitioner") {
        return getPractitionerCareChatRequests({ page: 1, limit: 6 });
      }
      return getAdminCareChatRequests({ page: 1, limit: 6 });
    },
    enabled: shouldFetchLaneData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const supportQuery = useQuery({
    queryKey: ["unified-messages-shell", role, "support"],
    queryFn: async () => {
      if (role === "patient") {
        return getPatientSupportTickets({ page: 1, limit: 6 });
      }
      if (role === "practitioner") {
        return getPractitionerSupportTickets({ page: 1, limit: 6 });
      }
      return getAdminSupportTickets({ page: 1, limit: 6 });
    },
    enabled: shouldFetchSupportLaneData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const unreadSummaryQuery = useQuery({
    queryKey: unreadSummaryQueryKey,
    queryFn: () => getUnifiedMessagingUnreadSummary(),
    initialData: () =>
      queryClient.getQueryData<{ item: UnifiedMessagingUnreadSummary }>(
        unreadSummaryQueryKey,
      ),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
    refetchInterval: isPageVisible ? 20_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const DIRTY_REFRESH_DEBOUNCE_MS = 1000;

    const runDirtyRefresh = () => {
      void unreadSummaryQuery.refetch();
      if (!shouldFetchLaneData) {
        return;
      }

      if (activeLane === "support") {
        if (!suppressSupportLaneFetch) {
          void supportQuery.refetch();
        }
        return;
      }

      if (activeLane === "practitioner") {
        void practitionerQuery.refetch();
        return;
      }

      if (activeLane === "session" && role !== "admin") {
        void sessionQuery.refetch();
        return;
      }

      if (!suppressSupportLaneFetch) {
        void supportQuery.refetch();
      }
      void practitionerQuery.refetch();
      if (role !== "admin") {
        void sessionQuery.refetch();
      }
    };

    const handler = () => {
      if (dirtyRefreshTimerRef.current) {
        return;
      }

      dirtyRefreshTimerRef.current = window.setTimeout(() => {
        dirtyRefreshTimerRef.current = null;
        runDirtyRefresh();
      }, DIRTY_REFRESH_DEBOUNCE_MS);
    };

    window.addEventListener("unified-messages:unread-summary:dirty", handler);
    return () => {
      window.removeEventListener("unified-messages:unread-summary:dirty", handler);
      if (dirtyRefreshTimerRef.current) {
        window.clearTimeout(dirtyRefreshTimerRef.current);
        dirtyRefreshTimerRef.current = null;
      }
    };
  }, [
    activeLane,
    practitionerQuery,
    role,
    sessionQuery,
    shouldFetchSupportLaneData,
    shouldFetchLaneData,
    suppressSupportLaneFetch,
    supportQuery,
    unreadSummaryQuery,
  ]);

  const sessionItems = useMemo(() => {
    const rows = (sessionQuery.data?.items ?? []) as SessionListItem[];
    const prepared = rows
      .filter((item) => item.chatAvailability?.canRead === true)
      .sort((a, b) => {
        const statusScore =
          getSessionPriority(b.presentationStatus) - getSessionPriority(a.presentationStatus);
        if (statusScore !== 0) return statusScore;
        const aAt = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0;
        const bAt = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0;
        return bAt - aAt;
      });

    return prepared.slice(0, 6).map((item) => ({
      id: item.id,
      title:
        role === "patient"
          ? item.practitioner.displayName ?? "Session chat"
          : item.patient?.displayName ?? "Session chat",
      note: `Session #${item.sessionCode}`,
      href: buildSessionHref(role, item.id),
      status: item.presentationStatus.replaceAll("_", " "),
      sessionStatus: mapSessionChatStatus(item.presentationStatus),
      isSessionPriority:
        item.presentationStatus === "JOINABLE" ||
        item.presentationStatus === "IN_PROGRESS",
      at: item.scheduledStartAt,
    }));
  }, [role, sessionQuery.data?.items]);

  const practitionerItems = useMemo(() => {
    const rows = (practitionerQuery.data?.items ?? []) as CareChatRequestItem[];
    return rows.slice(0, 6).map((item) => ({
      id: item.id,
      title:
        role === "patient"
          ? item.practitioner.displayName ?? "Practitioner message"
          : item.patient.displayName ?? "Practitioner message",
      note:
        role === "admin"
          ? `${item.patient.displayName ?? "Patient"} - ${item.practitioner.displayName ?? "Practitioner"}`
          : item.reason ?? "Follow-up care conversation",
      href: buildCareHref(role, item.id),
      careRequestId: item.id,
      careConversationId: item.linkedConversationId,
      careRequestStatus: item.status,
      hasUnread: Boolean(item.hasUnread),
      unreadCount: item.unreadCount ?? 0,
      status: mapCareStatus(item.status),
      at: item.requestedAt,
    }));
  }, [practitionerQuery.data?.items, role]);

  const supportItems = useMemo(() => {
    const rows = (supportQuery.data?.items ?? []) as SupportTicketSummary[];
    return rows.slice(0, 6).map((item) => ({
      id: item.id,
      title: item.subject,
      note: item.category.replaceAll("_", " "),
      href: buildSupportHref(role, item.id),
      supportTicketId: item.id,
      supportStatus: item.status,
      hasUnread: Boolean(item.hasUnread),
      unreadCount: item.unreadCount ?? 0,
      status: mapSupportStatus(item.status),
      at: item.lastMessageAt ?? item.createdAt,
    }));
  }, [role, supportQuery.data?.items]);

  const sessionAttentionCount = useMemo(() => {
    const rows = (sessionQuery.data?.items ?? []) as SessionListItem[];
    return rows.filter(
      (item) =>
        item.presentationStatus === "JOINABLE" ||
        item.presentationStatus === "IN_PROGRESS",
    ).length;
  }, [sessionQuery.data?.items]);

  const practitionerAttentionCount = useMemo(() => {
    const rows = (practitionerQuery.data?.items ?? []) as CareChatRequestItem[];
    return rows.filter((item) => item.status === "PENDING").length;
  }, [practitionerQuery.data?.items]);

  const supportAttentionCount = useMemo(() => {
    const rows = (supportQuery.data?.items ?? []) as SupportTicketSummary[];
    if (role === "admin") {
      return rows.filter(
        (item) =>
          item.status === "OPEN" || item.status === "IN_PROGRESS" || item.status === "ESCALATED",
      ).length;
    }
    return rows.filter((item) => item.status === "WAITING_FOR_USER").length;
  }, [role, supportQuery.data?.items]);

  const unreadSummary = unreadSummaryQuery.data?.item ?? null;

  // Badge semantics: show unread messages (not unread conversations) when backend truth is available.
  const sessionUnreadMessages = unreadSummary
    ? unreadSummary.session.unreadMessages
    : role === "admin"
      ? 0
      : sessionAttentionCount;

  const practitionerUnreadMessages = unreadSummary
    ? unreadSummary.practitioner.unreadMessages
    : practitionerAttentionCount;

  const supportUnreadMessages = unreadSummary
    ? unreadSummary.support.unreadMessages
    : supportAttentionCount;

  const totalUnreadMessages = unreadSummary
    ? unreadSummary.totalUnreadMessages
    : sessionUnreadMessages + practitionerUnreadMessages + supportUnreadMessages;

  const sessionSignal = useMemo<UnifiedSessionSignal>(() => {
    const rows = sessionItems;
    const hasInProgress = rows.some((item) => item.sessionStatus === "IN_PROGRESS");
    const hasReadyToJoin = rows.some((item) => item.sessionStatus === "READY_TO_JOIN");
    const highestPriority = rows.find((item) => item.isSessionPriority);

    return {
      hasInProgress,
      hasReadyToJoin,
      highestPrioritySessionId: highestPriority?.id ?? null,
    };
  }, [sessionItems]);

  return {
    sessionLane: {
      items: sessionItems,
      loading: role !== "admin" && sessionQuery.isLoading,
      error: role !== "admin" && sessionQuery.isError,
      attentionCount: role === "admin" ? 0 : sessionUnreadMessages,
      refetch: () => {
        void sessionQuery.refetch();
        void unreadSummaryQuery.refetch();
      },
    },
    practitionerLane: {
      items: practitionerItems,
      loading: practitionerQuery.isLoading,
      error: practitionerQuery.isError,
      attentionCount: practitionerUnreadMessages,
      refetch: () => {
        void practitionerQuery.refetch();
        void unreadSummaryQuery.refetch();
      },
    },
    supportLane: {
      items: supportItems,
      loading: supportQuery.isLoading,
      error: supportQuery.isError,
      attentionCount: supportUnreadMessages,
      refetch: () => {
        void supportQuery.refetch();
        void unreadSummaryQuery.refetch();
      },
    },
    unreadLikeCount: totalUnreadMessages,
    sessionSignal,
    sessionRootHref: buildSessionRootHref(role),
    practitionerRootHref: buildCareRootHref(role),
    supportRootHref: buildSupportRootHref(role),
  };
}
