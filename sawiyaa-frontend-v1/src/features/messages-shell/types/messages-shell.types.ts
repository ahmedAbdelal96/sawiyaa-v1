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

export interface MessagingParticipant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  publicRoleLabel: "Patient" | "Practitioner" | "Support team" | "Admin" | "System";
}

export interface MessagingMessage {
  id: string;
  sender: MessagingParticipant;
  body: string;
  messageType: string;
  sentAt: string;
  status: string;
  deliveredAt: string | null;
  readAt: string | null;
  attachments?: Array<{
    id: string;
    fileUrl: string;
    mimeType: string;
    fileSize?: number;
    originalName?: string;
  }>;
  clientMessageId?: string;
  deliveryState?: "sending" | "sent" | "failed";
  deliveryErrorCode?: string;
}

export interface CanonicalConversation {
  id: string;
  conversationId: string;
  supportTicketId: string | null;
  type: "SESSION" | "CARE" | "SUPPORT";
  title: string;
  subject: string | null;
  contextLabel: string;
  contextId: string;
  status: string;
  isResolved: boolean;
  isReadOnly: boolean;
  canSend: boolean;
  sendDisabledReason: string | null;
  unreadCount: number;
  lastMessage: MessagingMessage | null;
  participants: MessagingParticipant[];
  otherParty: MessagingParticipant | null;
  supportQueueState: "NEEDS_SUPPORT_REPLY" | "WAITING_FOR_USER" | "RESOLVED" | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface CanonicalConversationListResponse {
  items: CanonicalConversation[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CanonicalMessageListResponse {
  items: MessagingMessage[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CanonicalUnreadSummary {
  unreadCount: number;
  needsSupportReplyCount: number;
  hasUnread: boolean;
}

