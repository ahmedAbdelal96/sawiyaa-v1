export type FeaturedPlacementSurface = "HOME" | "DISCOVERY" | "ALL";
export type FeaturedPlacementStatus = "ACTIVE" | "PAUSED" | "EXPIRED";
export type FeaturedPlacementReason =
  | "FEATURED"
  | "SPONSORED"
  | "DISCOUNT"
  | "NEW_SPECIALIST"
  | "HIGH_AVAILABILITY"
  | "EDITORIAL_PICK";

export type FeaturedPlacementHistoryAction =
  | "CREATED"
  | "UPDATED"
  | "PAUSED"
  | "RESUMED"
  | "EXPIRED"
  | "DELETED"
  | "PRIORITY_CHANGED"
  | "DATE_CHANGED";

export interface AdminFeaturedPractitionerSummary {
  id: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
}

export interface AdminFeaturedActorSummary {
  id: string;
  displayName: string | null;
}

export interface AdminFeaturedPlacement {
  id: string;
  practitioner: AdminFeaturedPractitionerSummary | null;
  practitionerId: string;
  surface: FeaturedPlacementSurface;
  status: FeaturedPlacementStatus;
  startsAt: string;
  endsAt: string | null;
  priority: number;
  badgeLabelAr: string | null;
  badgeLabelEn: string | null;
  reason: FeaturedPlacementReason;
  campaignName: string | null;
  notesInternal: string | null;
  createdByAdmin: AdminFeaturedActorSummary | null;
  pausedByAdmin: AdminFeaturedActorSummary | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFeaturedPlacementsListResponse {
  items: AdminFeaturedPlacement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListAdminFeaturedPlacementsParams {
  status?: FeaturedPlacementStatus;
  surface?: FeaturedPlacementSurface;
  reason?: FeaturedPlacementReason;
  practitionerSearch?: string;
  startsFrom?: string;
  endsTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateAdminFeaturedPlacementInput {
  practitionerId?: string;
  practitionerSlug?: string;
  surface: FeaturedPlacementSurface;
  startsAt: string;
  endsAt?: string;
  priority?: number;
  badgeLabelAr?: string;
  badgeLabelEn?: string;
  reason?: FeaturedPlacementReason;
  campaignName?: string;
  notesInternal?: string;
  status?: FeaturedPlacementStatus;
}

export interface UpdateAdminFeaturedPlacementInput {
  surface?: FeaturedPlacementSurface;
  startsAt?: string;
  endsAt?: string;
  priority?: number;
  badgeLabelAr?: string;
  badgeLabelEn?: string;
  reason?: FeaturedPlacementReason;
  campaignName?: string;
  notesInternal?: string;
  status?: FeaturedPlacementStatus;
}

export interface PlacementActionNoteInput {
  note?: string;
}

export interface AdminFeaturedPlacementHistoryItem {
  id: string;
  action: FeaturedPlacementHistoryAction;
  actor: AdminFeaturedActorSummary | null;
  beforeSnapshot: Record<string, unknown> | null;
  afterSnapshot: Record<string, unknown> | null;
  note: string | null;
  createdAt: string;
}
