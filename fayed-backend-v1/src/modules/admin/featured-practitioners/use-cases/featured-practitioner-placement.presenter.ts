export function presentPlacement(item: {
  id: string;
  practitionerId: string;
  surface: string;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  priority: number;
  badgeLabelAr: string | null;
  badgeLabelEn: string | null;
  reason: string;
  campaignName: string | null;
  notesInternal: string | null;
  createdByAdminId: string | null;
  pausedByAdminId: string | null;
  pausedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  practitioner?: {
    id: string;
    publicSlug: string;
    status: string;
    professionalTitle: string | null;
    avatarUrl: string | null;
    user: { id: string; displayName: string | null };
  } | null;
  createdByAdmin?: { id: string; displayName: string | null } | null;
  pausedByAdmin?: { id: string; displayName: string | null } | null;
}) {
  return {
    id: item.id,
    practitioner: item.practitioner
      ? {
          id: item.practitioner.id,
          slug: item.practitioner.publicSlug,
          status: item.practitioner.status,
          displayName: item.practitioner.user.displayName,
          professionalTitle: item.practitioner.professionalTitle,
          avatarUrl: item.practitioner.avatarUrl,
        }
      : null,
    practitionerId: item.practitionerId,
    surface: item.surface,
    status: item.status,
    startsAt: item.startsAt.toISOString(),
    endsAt: item.endsAt?.toISOString() ?? null,
    priority: item.priority,
    badgeLabelAr: item.badgeLabelAr,
    badgeLabelEn: item.badgeLabelEn,
    reason: item.reason,
    campaignName: item.campaignName,
    notesInternal: item.notesInternal,
    createdByAdmin: item.createdByAdmin
      ? {
          id: item.createdByAdmin.id,
          displayName: item.createdByAdmin.displayName,
        }
      : null,
    pausedByAdmin: item.pausedByAdmin
      ? {
          id: item.pausedByAdmin.id,
          displayName: item.pausedByAdmin.displayName,
        }
      : null,
    pausedAt: item.pausedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
