import { Injectable } from '@nestjs/common';
import {
  ModerationCaseActionType,
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
} from '@prisma/client';
import {
  ModerationCaseDetail,
  ModerationQueueCase,
  ModerationReporterSnapshot,
  ModerationTargetSnapshot,
} from '../types/moderation.types';

@Injectable()
export class ModerationPresenter {
  presentReportItem(input: {
    id: string;
    targetType: ModerationReportTargetType;
    targetId: string;
    reason: ModerationReportReason;
    note: string | null;
    status: ModerationCaseStatus;
    createdAt: Date;
  }) {
    return {
      id: input.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      note: input.note,
      status: input.status,
      createdAt: input.createdAt.toISOString(),
    };
  }

  presentQueueItem(input: ModerationQueueCase) {
    return {
      id: input.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      status: input.status,
      reporterRole: input.reportedByRole,
      lastActionAt: input.lastActionAt?.toISOString() ?? null,
      targetSnapshot: this.presentTargetSnapshot(input.targetSnapshot),
      createdAt: input.createdAt.toISOString(),
    };
  }

  presentCaseDetail(input: ModerationCaseDetail) {
    return {
      ...this.presentQueueItem(input),
      reporterUserId: input.reportedByUserId,
      note: input.note,
      reporter: this.presentReporterSnapshot(input.reporter),
    };
  }

  presentQueue(input: {
    items: ModerationQueueCase[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }) {
    return {
      items: input.items.map((item) => this.presentQueueItem(item)),
      pagination: input.pagination,
    };
  }

  private presentTargetSnapshot(input: ModerationTargetSnapshot | null) {
    if (!input) {
      return null;
    }

    switch (input.kind) {
      case 'CARE_CHAT_CONVERSATION':
        return {
          kind: input.kind,
          context: {
            conversationStatus: input.conversationStatus,
            patientProfileId: input.patientProfileId,
            practitionerProfileId: input.practitionerProfileId,
            updatedAt: input.updatedAt.toISOString(),
          },
        };
      case 'CARE_CHAT_MESSAGE':
        return {
          kind: input.kind,
          context: {
            conversationId: input.conversationId,
            sentAt: input.sentAt.toISOString(),
            preview: input.preview,
          },
        };
      case 'GENERAL_CHAT_CONVERSATION':
        return {
          kind: input.kind,
          context: {
            conversationStatus: input.conversationStatus,
            participantCount: input.participantCount,
            updatedAt: input.updatedAt.toISOString(),
          },
        };
      case 'GENERAL_CHAT_MESSAGE':
        return {
          kind: input.kind,
          context: {
            conversationId: input.conversationId,
            sentAt: input.sentAt.toISOString(),
            preview: input.preview,
          },
        };
      case 'REVIEW':
        return {
          kind: input.kind,
          context: {
            sessionId: input.sessionId,
            ratingValue: input.ratingValue,
            reviewStatus: input.reviewStatus,
            submittedAt: input.submittedAt?.toISOString() ?? null,
          },
        };
      case 'ARTICLE':
        return {
          kind: input.kind,
          context: {
            status: input.status,
            visibility: input.visibility,
            slug: input.slug,
            updatedAt: input.updatedAt.toISOString(),
          },
        };
      case 'SUPPORT_TICKET':
        return {
          kind: input.kind,
          context: {
            ticketType: input.ticketType,
            status: input.status,
            priority: input.priority,
            subject: input.subject,
            updatedAt: input.updatedAt.toISOString(),
          },
        };
      case 'SUPPORT_MESSAGE':
        return {
          kind: input.kind,
          context: {
            conversationId: input.conversationId,
            supportTicketId: input.supportTicketId,
            sentAt: input.sentAt.toISOString(),
            preview: input.preview,
          },
        };
      default:
        return null;
    }
  }

  presentActionExecution(input: {
    actionId: string;
    action: ModerationCaseActionType;
    previousStatus: ModerationCaseStatus;
    nextStatus: ModerationCaseStatus;
    reason: string | null;
    note: string | null;
    createdAt: Date;
  }) {
    return {
      actionId: input.actionId,
      action: input.action,
      previousStatus: input.previousStatus,
      nextStatus: input.nextStatus,
      reason: input.reason,
      note: input.note,
      createdAt: input.createdAt.toISOString(),
    };
  }

  private presentReporterSnapshot(input: ModerationReporterSnapshot | null) {
    if (!input) {
      return null;
    }

    return {
      userId: input.userId,
      displayName: input.displayName,
      email: input.email,
      phone: input.phone,
      patientProfileId: input.patientProfileId,
      practitionerProfileId: input.practitionerProfileId,
    };
  }
}
