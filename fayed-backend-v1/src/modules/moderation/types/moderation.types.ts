import { AppRole } from '@common/enums/app-role.enum';
import {
  ModerationCaseActionType,
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
} from '@prisma/client';

export const MODERATION_SUPPORTED_TARGET_TYPES: ModerationReportTargetType[] = [
  ModerationReportTargetType.CARE_CHAT_CONVERSATION,
  ModerationReportTargetType.CARE_CHAT_MESSAGE,
  ModerationReportTargetType.GENERAL_CHAT_CONVERSATION,
  ModerationReportTargetType.GENERAL_CHAT_MESSAGE,
  ModerationReportTargetType.REVIEW,
  ModerationReportTargetType.ARTICLE,
  ModerationReportTargetType.SUPPORT_TICKET,
  ModerationReportTargetType.SUPPORT_MESSAGE,
];

export const MODERATION_SUPPORTED_REASONS: ModerationReportReason[] = [
  ModerationReportReason.ABUSE,
  ModerationReportReason.HARASSMENT,
  ModerationReportReason.SPAM,
  ModerationReportReason.SCAM,
  ModerationReportReason.INAPPROPRIATE_CONTENT,
  ModerationReportReason.PRIVACY_BREACH,
  ModerationReportReason.OTHER,
];

export const MODERATION_INTAKE_ALLOWED_ROLES: AppRole[] = [
  AppRole.PATIENT,
  AppRole.PRACTITIONER,
  AppRole.SUPPORT_AGENT,
  AppRole.ADMIN,
];

export const MODERATION_REVIEW_ALLOWED_ROLES: AppRole[] = [
  AppRole.ADMIN,
  AppRole.SUPPORT_AGENT,
  AppRole.CONTENT_REVIEWER,
];

export const MODERATION_REPORTS_ERROR_CODES = {
  invalidFilter: 'MODERATION_REPORTS_INVALID_FILTER',
  forbiddenScope: 'MODERATION_REPORTS_FORBIDDEN_SCOPE',
  reportNotFoundInScope: 'MODERATION_REPORT_NOT_FOUND_IN_SCOPE',
} as const;

export const MODERATION_REPORTS_ROUTE_SCOPE = {
  adminOperatorReadable: ['/admin/moderation/reports', '/admin/moderation/reports/:id'],
  adminOperatorActionable: ['/admin/moderation/reports/:id/actions'],
  publicIntake: ['/moderation/reports'],
} as const;

export type ModerationTargetSnapshot =
  | {
      kind: 'CARE_CHAT_CONVERSATION';
      conversationStatus: string;
      patientProfileId: string | null;
      practitionerProfileId: string | null;
      updatedAt: Date;
    }
  | {
      kind: 'CARE_CHAT_MESSAGE';
      conversationId: string;
      sentAt: Date;
      preview: string | null;
    }
  | {
      kind: 'GENERAL_CHAT_CONVERSATION';
      conversationStatus: string;
      participantCount: number;
      updatedAt: Date;
    }
  | {
      kind: 'GENERAL_CHAT_MESSAGE';
      conversationId: string;
      sentAt: Date;
      preview: string | null;
    }
  | {
      kind: 'REVIEW';
      sessionId: string;
      ratingValue: number;
      reviewStatus: string;
      submittedAt: Date | null;
    }
  | {
      kind: 'ARTICLE';
      status: string;
      visibility: string;
      slug: string;
      updatedAt: Date;
    }
  | {
      kind: 'SUPPORT_TICKET';
      ticketType: string;
      status: string;
      priority: string;
      subject: string;
      updatedAt: Date;
    }
  | {
      kind: 'SUPPORT_MESSAGE';
      conversationId: string;
      sentAt: Date;
      preview: string | null;
    };

export type ModerationQueueCase = {
  id: string;
  targetType: ModerationReportTargetType;
  targetId: string;
  reason: ModerationReportReason;
  status: ModerationCaseStatus;
  reportedByRole: ModerationReporterRole;
  createdAt: Date;
  lastActionAt: Date | null;
  targetSnapshot: ModerationTargetSnapshot | null;
};

export type ModerationCaseDetail = ModerationQueueCase & {
  note: string | null;
  reportedByUserId: string | null;
};

export type ModerationRoleActionMatrix = Record<
  AppRole.ADMIN | AppRole.SUPPORT_AGENT | AppRole.CONTENT_REVIEWER,
  ModerationCaseActionType[]
>;

export function mapAppRoleToModerationReporterRole(
  roles: AppRole[],
): ModerationReporterRole | null {
  if (roles.includes(AppRole.ADMIN)) {
    return ModerationReporterRole.ADMIN;
  }
  if (roles.includes(AppRole.SUPPORT_AGENT)) {
    return ModerationReporterRole.SUPPORT_AGENT;
  }
  if (roles.includes(AppRole.CONTENT_REVIEWER)) {
    return ModerationReporterRole.CONTENT_REVIEWER;
  }
  if (roles.includes(AppRole.PATIENT)) {
    return ModerationReporterRole.PATIENT;
  }
  if (roles.includes(AppRole.PRACTITIONER)) {
    return ModerationReporterRole.PRACTITIONER;
  }

  return null;
}
