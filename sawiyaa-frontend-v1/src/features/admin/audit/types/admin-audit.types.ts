export type AdminAuditActorRole =
  | "PATIENT"
  | "PRACTITIONER"
  | "ADMIN"
  | "SUPPORT"
  | "CONTENT_REVIEWER"
  | "SUPER_ADMIN";

export type AdminAuditCategory =
  | "SECURITY"
  | "SESSION"
  | "PAYMENT"
  | "CONTENT"
  | "SUPPORT"
  | "CHAT"
  | "SYSTEM"
  | "MARKETING";

export type AdminAuditSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AdminAuditSource = "SYSTEM" | "EMAIL" | "SMS" | "PUSH" | "IN_APP";

export type ListAdminAuditEventsParams = {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  actorRole?: AdminAuditActorRole;
  eventFamily?: string;
  category?: AdminAuditCategory;
  severity?: AdminAuditSeverity;
  source?: AdminAuditSource;
  targetEntityType?: string;
  search?: string;
};

export type AdminAuditPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AdminAuditListItem = {
  id: string;
  action: string;
  eventFamily: string;
  category: AdminAuditCategory;
  severity: AdminAuditSeverity;
  source: AdminAuditSource;
  status:
    | "PENDING"
    | "QUEUED"
    | "SENT"
    | "DELIVERED"
    | "READ"
    | "FAILED"
    | "CANCELLED"
    | "SUPPRESSED";
  occurredAt: string;
  actor: {
    userId: string;
    displayName: string | null;
    role: AdminAuditActorRole | null;
  };
  target: {
    entityType: string | null;
    entityId: string | null;
  };
};

export type AdminAuditDetailItem = AdminAuditListItem & {
  titleSnapshot: string | null;
  subjectSnapshot: string | null;
  bodySnapshot: string | null;
  suppressedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAuditListResponseData = {
  items: AdminAuditListItem[];
  pagination: AdminAuditPagination;
};

export type AdminAuditDetailResponseData = {
  item: AdminAuditDetailItem;
};
