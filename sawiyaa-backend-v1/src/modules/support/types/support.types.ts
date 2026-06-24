import {
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '@prisma/client';

export type SupportActorKind = 'PATIENT' | 'PRACTITIONER';

export type SupportOwnerContext = {
  userId: string;
  actorKind: SupportActorKind;
  patientProfileId?: string;
  practitionerProfileId?: string;
};

export type SupportAdminActorContext = {
  userId: string;
  actorRole: 'ADMIN' | 'SUPPORT_AGENT';
};

export type SupportTicketListQuery = {
  page: number;
  limit: number;
  status?: SupportTicketStatus;
  category?: SupportTicketType;
  priority?: SupportTicketPriority;
  assignedToMe?: boolean;
};
