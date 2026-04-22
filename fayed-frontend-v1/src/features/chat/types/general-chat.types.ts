export type GeneralChatConversationStatus =
  | "OPEN"
  | "PENDING"
  | "CLOSED"
  | "EXPIRED"
  | "SUSPENDED";

export type GeneralChatConversationParticipantRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "SUPPORT_AGENT"
  | "ADMIN"
  | "SYSTEM";

export type GeneralChatConversationParticipant = {
  userId: string;
  role: GeneralChatConversationParticipantRole;
};

export type GeneralChatConversationIdentity = {
  conversationId: string;
  conversationRef: string;
  conversationType: "SYSTEM";
  status: GeneralChatConversationStatus;
  linkedSessionId: string | null;
  participants: GeneralChatConversationParticipant[];
  wasCreated: boolean;
};

export type GeneralChatOpenSessionResponse = {
  item: GeneralChatConversationIdentity;
};

export type GeneralChatAttachmentRef = {
  fileId: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number | null;
  originalName: string | null;
};

export type GeneralChatMessageType =
  | "TEXT"
  | "SYSTEM"
  | "FILE"
  | "IMAGE"
  | "NOTE_REFERENCE"
  | "APPROVAL_NOTICE";

export type GeneralChatMessageStatus =
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "DELETED";

export type GeneralChatMessageItem = {
  messageId: string;
  conversationId: string;
  senderUserId: string | null;
  messageType: GeneralChatMessageType;
  status: GeneralChatMessageStatus;
  contentText: string | null;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  attachments: GeneralChatAttachmentRef[];
  conversationLatestActivityAt: string;
};

export type GeneralChatMessagesPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type GeneralChatMessagesListResponse = {
  items: GeneralChatMessageItem[];
  pagination: GeneralChatMessagesPagination;
};

export type ListGeneralChatMessagesParams = {
  page?: number;
  limit?: number;
};

export type SendGeneralChatMessageInput = {
  message: string;
  attachments?: Array<{
    fileId: string;
    fileUrl: string;
    mimeType: string;
    fileSize?: number;
    originalName?: string;
  }>;
};

export type SendGeneralChatMessageResponse = {
  item: GeneralChatMessageItem;
};

export type UploadGeneralChatAttachmentResponse = {
  item: GeneralChatAttachmentRef;
};
