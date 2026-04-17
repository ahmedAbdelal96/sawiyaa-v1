import type { SessionMode, SessionStatus } from "@/features/sessions/types/sessions.types";

export type ListAdminSessionsParams = {
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest";
  query?: string;
  status?: SessionStatus;
  late?: boolean;
  practitionerId?: string;
  patientId?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  missingAttendance?: boolean;
};

export type AdminSessionsPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type AdminSessionListItem = {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  durationMinutes: number;
  sessionMode: SessionMode;
  practitioner: {
    id: string;
    slug: string;
    displayName: string | null;
  };
  patient: {
    id: string;
    displayName: string | null;
  } | null;
  isDelayed: boolean;
};

export type AdminSessionsListData = {
  items: AdminSessionListItem[];
  pagination: AdminSessionsPagination;
};
