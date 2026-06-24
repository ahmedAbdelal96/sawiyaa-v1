export type UnifiedMessagingRole = "patient" | "practitioner" | "admin";

export type UnifiedMessagingLane = "session" | "practitioner" | "support";

export type UnifiedSessionChatStatus =
  | "READY_TO_JOIN"
  | "IN_PROGRESS"
  | "COMPLETED";

export type UnifiedMessagingLaneItem = {
  id: string;
  title: string;
  note: string;
  href: string;
  hasUnread?: boolean;
  unreadCount?: number;
  status?: string;
  supportTicketId?: string;
  supportStatus?: string;
  careRequestId?: string;
  careConversationId?: string | null;
  careRequestStatus?: string;
  sessionStatus?: UnifiedSessionChatStatus;
  isSessionPriority?: boolean;
  at?: string | null;
};

export type UnifiedMessagingLaneSnapshot = {
  items: UnifiedMessagingLaneItem[];
  loading: boolean;
  error: boolean;
  attentionCount: number;
  refetch: () => void;
};

export type UnifiedSessionSignal = {
  hasInProgress: boolean;
  hasReadyToJoin: boolean;
  highestPrioritySessionId: string | null;
};

export type UnifiedUnreadLaneSummary = {
  unreadMessages: number;
  unreadConversations: number;
};

export type UnifiedMessagingUnreadSummary = {
  session: UnifiedUnreadLaneSummary;
  support: UnifiedUnreadLaneSummary;
  practitioner: UnifiedUnreadLaneSummary;
  totalUnreadMessages: number;
  totalUnreadConversations: number;
};
