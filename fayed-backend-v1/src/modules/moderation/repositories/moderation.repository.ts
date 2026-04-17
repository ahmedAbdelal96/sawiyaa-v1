import { Injectable } from '@nestjs/common';
import {
  ArticleStatus,
  ArticleVisibility,
  ConversationType,
  ModerationAuditEventType,
  ModerationCaseActionType,
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
  MessageVisibility,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  ModerationReportsSortByDto,
  ModerationReportsSortOrderDto,
} from '../dto/list-moderation-cases.dto';
import {
  ModerationCaseDetail,
  ModerationQueueCase,
  ModerationTargetSnapshot,
} from '../types/moderation.types';

@Injectable()
export class ModerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAccessibleTarget(input: {
    targetType: ModerationReportTargetType;
    targetId: string;
    userId: string;
    reporterRole: ModerationReporterRole;
  }): Promise<{ id: string } | null> {
    switch (input.targetType) {
      case ModerationReportTargetType.CARE_CHAT_CONVERSATION:
        return this.findCareChatConversation(input);
      case ModerationReportTargetType.CARE_CHAT_MESSAGE:
        return this.findCareChatMessage(input);
      case ModerationReportTargetType.GENERAL_CHAT_CONVERSATION:
        return this.findGeneralChatConversation(input);
      case ModerationReportTargetType.GENERAL_CHAT_MESSAGE:
        return this.findGeneralChatMessage(input);
      case ModerationReportTargetType.REVIEW:
        return this.findReview(input);
      case ModerationReportTargetType.ARTICLE:
        return this.findArticle(input);
      case ModerationReportTargetType.SUPPORT_TICKET:
        return this.findSupportTicket(input);
      case ModerationReportTargetType.SUPPORT_MESSAGE:
        return this.findSupportMessage(input);
      default:
        return Promise.resolve(null);
    }
  }

  findRecentDuplicate(input: {
    targetType: ModerationReportTargetType;
    targetId: string;
    reason: ModerationReportReason;
    reportedByUserId: string;
    reportedByRole: ModerationReporterRole;
    after: Date;
  }) {
    return this.prisma.moderationReport.findFirst({
      where: {
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        reportedByUserId: input.reportedByUserId,
        reportedByRole: input.reportedByRole,
        status: ModerationCaseStatus.OPEN,
        createdAt: {
          gte: input.after,
        },
      },
      select: {
        id: true,
      },
    });
  }

  createReportWithAudit(input: {
    targetType: ModerationReportTargetType;
    targetId: string;
    reason: ModerationReportReason;
    note: string | null;
    reporterUserId: string;
    reporterRole: ModerationReporterRole;
  }) {
    return this.prisma.moderationReport.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        note: input.note,
        status: ModerationCaseStatus.OPEN,
        reportedByUserId: input.reporterUserId,
        reportedByRole: input.reporterRole,
        auditEvents: {
          create: {
            eventType: ModerationAuditEventType.REPORT_CREATED,
            actorUserId: input.reporterUserId,
            actorRole: input.reporterRole,
            metadataJson: {
              targetType: input.targetType,
              targetId: input.targetId,
              reason: input.reason,
            },
          },
        },
      },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        note: true,
        status: true,
        createdAt: true,
      },
    });
  }

  executeCaseAction(input: {
    reportId: string;
    action: ModerationCaseActionType;
    previousStatus: ModerationCaseStatus;
    nextStatus: ModerationCaseStatus;
    actorUserId: string;
    actorRole: ModerationReporterRole;
    reason: string | null;
    note: string | null;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const updatedMany = await tx.moderationReport.updateMany({
        where: { id: input.reportId, status: input.previousStatus },
        data: {
          status: input.nextStatus,
        },
      });
      if (!updatedMany.count) {
        return null;
      }

      await tx.moderationReportAuditEvent.create({
        data: {
          moderationReportId: input.reportId,
          eventType: ModerationAuditEventType.CASE_ACTION_EXECUTED,
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          metadataJson: {
            action: input.action,
            previousStatus: input.previousStatus,
            nextStatus: input.nextStatus,
            reason: input.reason,
          },
        },
      });

      await tx.moderationReportAction.create({
        data: {
          moderationReportId: input.reportId,
          actionType: input.action,
          previousStatus: input.previousStatus,
          nextStatus: input.nextStatus,
          reason: input.reason,
          note: input.note,
          actedByUserId: input.actorUserId,
          actedByRole: input.actorRole,
        },
      });

      const updated = await tx.moderationReport.findUniqueOrThrow({
        where: { id: input.reportId },
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          note: true,
          status: true,
          reportedByUserId: true,
          reportedByRole: true,
          createdAt: true,
          actions: {
            orderBy: [{ createdAt: 'desc' }],
            take: 1,
            select: {
              id: true,
              actionType: true,
              previousStatus: true,
              nextStatus: true,
              reason: true,
              note: true,
              createdAt: true,
            },
          },
        },
      });

      return {
        ...updated,
        targetSnapshot: await this.resolveTargetSnapshot(
          updated.targetType,
          updated.targetId,
        ),
      };
    });
  }

  async listCases(input: {
    page: number;
    limit: number;
    status?: ModerationCaseStatus;
    targetType?: ModerationReportTargetType;
    reporterRole?: ModerationReporterRole;
    reason?: ModerationReportReason;
    createdFrom?: Date;
    createdTo?: Date;
    query?: string;
    sortBy?: ModerationReportsSortByDto;
    sortOrder?: ModerationReportsSortOrderDto;
  }): Promise<[ModerationQueueCase[], number]> {
    const skip = (input.page - 1) * input.limit;
    const normalizedQuery = input.query?.trim() || undefined;
    const sortOrder = (input.sortOrder ?? ModerationReportsSortOrderDto.DESC).toLowerCase() as
      | 'asc'
      | 'desc';
    const sortBy = input.sortBy ?? ModerationReportsSortByDto.CREATED_AT;
    const primaryOrderBy =
      sortBy === ModerationReportsSortByDto.CREATED_AT
        ? ({ createdAt: sortOrder } as const)
        : ({ createdAt: 'desc' } as const);
    const where = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.targetType ? { targetType: input.targetType } : {}),
      ...(input.reporterRole ? { reportedByRole: input.reporterRole } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
      ...(normalizedQuery
        ? {
            OR: [{ id: normalizedQuery }, { targetId: normalizedQuery }],
          }
        : {}),
      ...(input.createdFrom || input.createdTo
        ? {
            createdAt: {
              ...(input.createdFrom ? { gte: input.createdFrom } : {}),
              ...(input.createdTo ? { lte: input.createdTo } : {}),
            },
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      this.prisma.moderationReport.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [primaryOrderBy, { id: 'asc' }],
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          status: true,
          reportedByRole: true,
          createdAt: true,
          actions: {
            orderBy: [{ createdAt: 'desc' }],
            take: 1,
            select: {
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.moderationReport.count({ where }),
    ]);

    const items = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        targetType: row.targetType,
        targetId: row.targetId,
        reason: row.reason,
        status: row.status,
        reportedByRole: row.reportedByRole,
        createdAt: row.createdAt,
        lastActionAt: row.actions[0]?.createdAt ?? null,
        targetSnapshot: await this.resolveTargetSnapshot(
          row.targetType,
          row.targetId,
        ),
      })),
    );

    return [items, totalItems];
  }

  async findCaseById(reportId: string): Promise<ModerationCaseDetail | null> {
    const row = await this.prisma.moderationReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        note: true,
        status: true,
        reportedByUserId: true,
        reportedByRole: true,
        createdAt: true,
        actions: {
          orderBy: [{ createdAt: 'desc' }],
          take: 1,
          select: {
            createdAt: true,
          },
        },
      },
    });
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      targetType: row.targetType,
      targetId: row.targetId,
      reason: row.reason,
      note: row.note,
      status: row.status,
      reportedByUserId: row.reportedByUserId,
      reportedByRole: row.reportedByRole,
      createdAt: row.createdAt,
      lastActionAt: row.actions[0]?.createdAt ?? null,
      targetSnapshot: await this.resolveTargetSnapshot(row.targetType, row.targetId),
    };
  }

  private isPrivileged(role: ModerationReporterRole): boolean {
    return (
      role === ModerationReporterRole.ADMIN ||
      role === ModerationReporterRole.SUPPORT_AGENT
    );
  }

  private findCareChatConversation(input: {
    targetId: string;
    userId: string;
    reporterRole: ModerationReporterRole;
  }) {
    return this.prisma.conversation.findFirst({
      where: {
        id: input.targetId,
        conversationType: ConversationType.CARE_APPROVED,
        ...(this.isPrivileged(input.reporterRole)
          ? {}
          : {
              OR: [
                {
                  patient: {
                    userId: input.userId,
                  },
                },
                {
                  practitioner: {
                    userId: input.userId,
                  },
                },
              ],
            }),
      },
      select: { id: true },
    });
  }

  private findCareChatMessage(input: {
    targetId: string;
    userId: string;
    reporterRole: ModerationReporterRole;
  }) {
    return this.prisma.message.findFirst({
      where: {
        id: input.targetId,
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        conversation: {
          conversationType: ConversationType.CARE_APPROVED,
          ...(this.isPrivileged(input.reporterRole)
            ? {}
            : {
                OR: [
                  {
                    patient: {
                      userId: input.userId,
                    },
                  },
                  {
                    practitioner: {
                      userId: input.userId,
                    },
                  },
                ],
              }),
        },
      },
      select: { id: true },
    });
  }

  private findReview(input: {
    targetId: string;
    userId: string;
    reporterRole: ModerationReporterRole;
  }) {
    if (this.isPrivileged(input.reporterRole)) {
      return this.prisma.sessionReview.findUnique({
        where: { id: input.targetId },
        select: { id: true },
      });
    }

    return this.prisma.sessionReview.findFirst({
      where: {
        id: input.targetId,
        ...(input.reporterRole === ModerationReporterRole.PATIENT
          ? {
              patient: {
                userId: input.userId,
              },
            }
          : {
              practitioner: {
                userId: input.userId,
              },
            }),
      },
      select: { id: true },
    });
  }

  private findGeneralChatConversation(input: {
    targetId: string;
    userId: string;
    reporterRole: ModerationReporterRole;
  }) {
    return this.prisma.conversation.findFirst({
      where: {
        id: input.targetId,
        conversationType: ConversationType.SYSTEM,
        supportTicketId: null,
        chatApprovalRequestId: null,
        ...(this.isPrivileged(input.reporterRole)
          ? {}
          : {
              participants: {
                some: {
                  userId: input.userId,
                  isActive: true,
                },
              },
            }),
      },
      select: { id: true },
    });
  }

  private findGeneralChatMessage(input: {
    targetId: string;
    userId: string;
    reporterRole: ModerationReporterRole;
  }) {
    return this.prisma.message.findFirst({
      where: {
        id: input.targetId,
        deletedAt: null,
        visibility: MessageVisibility.NORMAL,
        conversation: {
          conversationType: ConversationType.SYSTEM,
          supportTicketId: null,
          chatApprovalRequestId: null,
          ...(this.isPrivileged(input.reporterRole)
            ? {}
            : {
                participants: {
                  some: {
                    userId: input.userId,
                    isActive: true,
                  },
                },
              }),
        },
      },
      select: { id: true },
    });
  }

  private findArticle(input: {
    targetId: string;
    reporterRole: ModerationReporterRole;
  }) {
    if (this.isPrivileged(input.reporterRole)) {
      return this.prisma.article.findUnique({
        where: { id: input.targetId },
        select: { id: true },
      });
    }

    return this.prisma.article.findFirst({
      where: {
        id: input.targetId,
        status: ArticleStatus.PUBLISHED,
        visibility: {
          in: [ArticleVisibility.PUBLIC, ArticleVisibility.UNLISTED],
        },
      },
      select: { id: true },
    });
  }

  private findSupportTicket(input: {
    targetId: string;
    userId: string;
    reporterRole: ModerationReporterRole;
  }) {
    if (this.isPrivileged(input.reporterRole)) {
      return this.prisma.supportTicket.findUnique({
        where: { id: input.targetId },
        select: { id: true },
      });
    }

    return this.prisma.supportTicket.findFirst({
      where: {
        id: input.targetId,
        ...(input.reporterRole === ModerationReporterRole.PATIENT
          ? {
              patient: {
                userId: input.userId,
              },
            }
          : {
              practitioner: {
                userId: input.userId,
              },
            }),
      },
      select: { id: true },
    });
  }

  private findSupportMessage(input: {
    targetId: string;
    userId: string;
    reporterRole: ModerationReporterRole;
  }) {
    if (this.isPrivileged(input.reporterRole)) {
      return this.prisma.message.findFirst({
        where: {
          id: input.targetId,
          deletedAt: null,
          conversation: {
            conversationType: ConversationType.SUPPORT,
            supportTicket: {
              isNot: null,
            },
          },
        },
        select: { id: true },
      });
    }

    return this.prisma.message.findFirst({
      where: {
        id: input.targetId,
        deletedAt: null,
        conversation: {
          conversationType: ConversationType.SUPPORT,
          supportTicket: {
            ...(input.reporterRole === ModerationReporterRole.PATIENT
              ? {
                  patient: {
                    userId: input.userId,
                  },
                }
              : {
                  practitioner: {
                    userId: input.userId,
                  },
                }),
          },
        },
      },
      select: { id: true },
    });
  }

  private async resolveTargetSnapshot(
    targetType: ModerationReportTargetType,
    targetId: string,
  ): Promise<ModerationTargetSnapshot | null> {
    switch (targetType) {
      case ModerationReportTargetType.CARE_CHAT_CONVERSATION: {
        const row = await this.prisma.conversation.findUnique({
          where: { id: targetId },
          select: {
            status: true,
            patientId: true,
            practitionerId: true,
            updatedAt: true,
          },
        });
        if (!row) {
          return null;
        }
        return {
          kind: 'CARE_CHAT_CONVERSATION',
          conversationStatus: row.status,
          patientProfileId: row.patientId,
          practitionerProfileId: row.practitionerId,
          updatedAt: row.updatedAt,
        };
      }
      case ModerationReportTargetType.CARE_CHAT_MESSAGE: {
        const row = await this.prisma.message.findFirst({
          where: {
            id: targetId,
            deletedAt: null,
            conversation: {
              conversationType: ConversationType.CARE_APPROVED,
            },
          },
          select: {
            conversationId: true,
            sentAt: true,
            contentText: true,
          },
        });
        if (!row) {
          return null;
        }
        return {
          kind: 'CARE_CHAT_MESSAGE',
          conversationId: row.conversationId,
          sentAt: row.sentAt,
          preview: this.previewText(row.contentText),
        };
      }
      case ModerationReportTargetType.REVIEW: {
        const row = await this.prisma.sessionReview.findUnique({
          where: { id: targetId },
          select: {
            sessionId: true,
            ratingValue: true,
            reviewStatus: true,
            submittedAt: true,
          },
        });
        if (!row) {
          return null;
        }
        return {
          kind: 'REVIEW',
          sessionId: row.sessionId,
          ratingValue: row.ratingValue,
          reviewStatus: row.reviewStatus,
          submittedAt: row.submittedAt,
        };
      }
      case ModerationReportTargetType.GENERAL_CHAT_CONVERSATION: {
        const row = await this.prisma.conversation.findFirst({
          where: {
            id: targetId,
            conversationType: ConversationType.SYSTEM,
            supportTicketId: null,
            chatApprovalRequestId: null,
          },
          select: {
            status: true,
            updatedAt: true,
            participants: {
              where: { isActive: true },
              select: { id: true },
            },
          },
        });
        if (!row) {
          return null;
        }
        return {
          kind: 'GENERAL_CHAT_CONVERSATION',
          conversationStatus: row.status,
          participantCount: row.participants.length,
          updatedAt: row.updatedAt,
        };
      }
      case ModerationReportTargetType.GENERAL_CHAT_MESSAGE: {
        const row = await this.prisma.message.findFirst({
          where: {
            id: targetId,
            deletedAt: null,
            visibility: MessageVisibility.NORMAL,
            conversation: {
              conversationType: ConversationType.SYSTEM,
              supportTicketId: null,
              chatApprovalRequestId: null,
            },
          },
          select: {
            conversationId: true,
            sentAt: true,
            contentText: true,
          },
        });
        if (!row) {
          return null;
        }
        return {
          kind: 'GENERAL_CHAT_MESSAGE',
          conversationId: row.conversationId,
          sentAt: row.sentAt,
          preview: this.previewText(row.contentText),
        };
      }
      case ModerationReportTargetType.ARTICLE: {
        const row = await this.prisma.article.findUnique({
          where: { id: targetId },
          select: {
            status: true,
            visibility: true,
            updatedAt: true,
            translations: {
              orderBy: [{ locale: 'asc' }],
              take: 1,
              select: {
                slug: true,
              },
            },
          },
        });
        if (!row) {
          return null;
        }
        return {
          kind: 'ARTICLE',
          status: row.status,
          visibility: row.visibility,
          slug: row.translations[0]?.slug ?? 'unknown',
          updatedAt: row.updatedAt,
        };
      }
      case ModerationReportTargetType.SUPPORT_TICKET: {
        const row = await this.prisma.supportTicket.findUnique({
          where: { id: targetId },
          select: {
            ticketType: true,
            status: true,
            priority: true,
            subject: true,
            updatedAt: true,
          },
        });
        if (!row) {
          return null;
        }
        return {
          kind: 'SUPPORT_TICKET',
          ticketType: row.ticketType,
          status: row.status,
          priority: row.priority,
          subject: row.subject,
          updatedAt: row.updatedAt,
        };
      }
      case ModerationReportTargetType.SUPPORT_MESSAGE: {
        const row = await this.prisma.message.findFirst({
          where: {
            id: targetId,
            deletedAt: null,
            conversation: {
              conversationType: ConversationType.SUPPORT,
              supportTicket: {
                isNot: null,
              },
            },
          },
          select: {
            conversationId: true,
            sentAt: true,
            contentText: true,
          },
        });
        if (!row) {
          return null;
        }
        return {
          kind: 'SUPPORT_MESSAGE',
          conversationId: row.conversationId,
          sentAt: row.sentAt,
          preview: this.previewText(row.contentText),
        };
      }
      default:
        return null;
    }
  }

  private previewText(input: string | null): string | null {
    if (!input) {
      return null;
    }
    const clean = input.trim();
    if (clean.length <= 160) {
      return clean;
    }
    return `${clean.slice(0, 157)}...`;
  }
}
