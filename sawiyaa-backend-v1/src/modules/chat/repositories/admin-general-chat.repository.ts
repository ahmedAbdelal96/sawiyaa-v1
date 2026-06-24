import { Injectable } from '@nestjs/common';
import {
  ConversationStatus,
  MessageVisibility,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

const adminConversationLatestMessageSelect =
  Prisma.validator<Prisma.MessageSelect>()({
    id: true,
    senderUserId: true,
    contentText: true,
    sentAt: true,
  attachments: {
      orderBy: [{ uploadedAt: 'asc' }, { id: 'asc' }],
      select: {
        fileUrl: true,
        mimeType: true,
        fileSize: true,
        originalName: true,
        storageProvider: true,
      },
    },
  });

const adminConversationSelect = Prisma.validator<Prisma.ConversationSelect>()({
  id: true,
  conversationType: true,
  conversationRef: true,
  status: true,
  sessionId: true,
  startedAt: true,
  closedAt: true,
  adminSendingDisabledAt: true,
  adminSendingDisabledByUserId: true,
  adminSendingDisabledReason: true,
  adminSendingEnabledAt: true,
  adminSendingEnabledByUserId: true,
  practitionerSendingDisabledAt: true,
  practitionerSendingDisabledByUserId: true,
  practitionerSendingDisabledReason: true,
  practitionerSendingEnabledAt: true,
  practitionerSendingEnabledByUserId: true,
  createdAt: true,
  updatedAt: true,
  session: {
    select: {
      id: true,
      sessionCode: true,
      scheduledStartAt: true,
      scheduledEndAt: true,
      status: true,
      createdAt: true,
    },
  },
  patient: {
    select: {
      id: true,
      displayName: true,
      userId: true,
      user: {
        select: {
          displayName: true,
          emails: {
            where: { isPrimary: true },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            take: 1,
            select: {
              email: true,
            },
          },
        },
      },
    },
  },
  practitioner: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          displayName: true,
          emails: {
            where: { isPrimary: true },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            take: 1,
            select: {
              email: true,
            },
          },
        },
      },
    },
  },
  participants: {
    where: { isActive: true },
    select: {
      userId: true,
      participantRole: true,
    },
    orderBy: [{ participantRole: 'asc' }, { userId: 'asc' }],
  },
  messages: {
    where: {
      deletedAt: null,
      visibility: MessageVisibility.NORMAL,
    },
    orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
    take: 1,
    select: adminConversationLatestMessageSelect,
  },
});

const adminConversationMessageSelect = Prisma.validator<Prisma.MessageSelect>()({
  id: true,
  conversationId: true,
  senderUserId: true,
  messageType: true,
  status: true,
  contentText: true,
  sentAt: true,
  deliveredAt: true,
  readAt: true,
  editedAt: true,
  deletedAt: true,
  attachments: {
    orderBy: [{ uploadedAt: 'asc' }, { id: 'asc' }],
    select: {
      fileUrl: true,
      mimeType: true,
      fileSize: true,
      originalName: true,
      storageProvider: true,
    },
  },
});

@Injectable()
export class AdminGeneralChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  listConversations(input: {
    where: Prisma.ConversationWhereInput;
    page: number;
    limit: number;
    orderBy: Prisma.ConversationOrderByWithRelationInput[];
  }) {
    const skip = (input.page - 1) * input.limit;
    return this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where: input.where,
        skip,
        take: input.limit,
        orderBy: input.orderBy,
        select: adminConversationSelect,
      }),
      this.prisma.conversation.count({ where: input.where }),
    ]);
  }

  findConversationById(conversationId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        conversationType: 'SYSTEM',
        sessionId: { not: null },
        supportTicketId: null,
        chatApprovalRequestId: null,
      },
      select: adminConversationSelect,
    });
  }

  listMessages(input: { conversationId: string; page: number; limit: number }) {
    const skip = (input.page - 1) * input.limit;
    const where = {
      conversationId: input.conversationId,
      deletedAt: null,
      visibility: MessageVisibility.NORMAL,
    } as const;

    return this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ sentAt: 'asc' }, { id: 'asc' }],
        select: adminConversationMessageSelect,
      }),
      this.prisma.message.count({ where }),
    ]);
  }

  findAttachmentForConversation(input: {
    conversationId: string;
    fileId: string;
  }) {
    return this.prisma.messageAttachment.findFirst({
      where: {
        OR: [
          {
            storageProvider: `ref:${input.fileId}`,
            message: {
              conversationId: input.conversationId,
              deletedAt: null,
              visibility: MessageVisibility.NORMAL,
            },
          },
          {
            fileUrl: {
              endsWith: `/${input.fileId}`,
            },
            message: {
              conversationId: input.conversationId,
              deletedAt: null,
              visibility: MessageVisibility.NORMAL,
            },
          },
        ],
      },
      select: {
        fileUrl: true,
        mimeType: true,
        fileSize: true,
        originalName: true,
        storageProvider: true,
        message: {
          select: {
            conversationId: true,
          },
        },
      },
    });
  }

  getConversationStats(conversationIds: string[]) {
    const uniqueConversationIds = Array.from(new Set(conversationIds)).filter(
      Boolean,
    );

    if (uniqueConversationIds.length === 0) {
      return Promise.resolve(
        new Map<
          string,
          { messagesCount: number; attachmentsCount: number }
        >(),
      );
    }

    return this.prisma
      .$queryRaw<
        Array<{
          conversationId: string;
          messagesCount: number;
          attachmentsCount: number;
        }>
      >(Prisma.sql`
        select
          m."conversationId" as "conversationId",
          count(distinct m.id)::int as "messagesCount",
          count(ma.id)::int as "attachmentsCount"
        from "Message" m
        left join "MessageAttachment" ma on ma."messageId" = m.id
        where m."conversationId"::text in (${Prisma.join(uniqueConversationIds)})
          and m."deletedAt" is null
          and m."visibility"::text = ${MessageVisibility.NORMAL}
        group by m."conversationId"
      `)
      .then((rows) => {
        return new Map(
          rows.map((row) => [
            row.conversationId,
            {
              messagesCount: Number(row.messagesCount ?? 0),
              attachmentsCount: Number(row.attachmentsCount ?? 0),
            },
          ]),
        );
      });
  }

  async updateConversationModeration(input: {
    conversationId: string;
    data: Prisma.ConversationUncheckedUpdateInput;
  }) {
    await this.prisma.conversation.update({
      where: { id: input.conversationId },
      data: input.data,
    });

    return this.findConversationById(input.conversationId);
  }

  buildSessionConversationWhere(input: {
    search?: string;
    status?: string;
    patientId?: string;
    practitionerId?: string;
    sessionId?: string;
    fromDate?: string;
    toDate?: string;
    hasAttachmentsOnly?: boolean;
  }): Prisma.ConversationWhereInput {
    const where: Prisma.ConversationWhereInput = {
      conversationType: 'SYSTEM',
      sessionId: { not: null },
      supportTicketId: null,
      chatApprovalRequestId: null,
      ...(input.patientId ? { patientId: input.patientId } : {}),
      ...(input.practitionerId ? { practitionerId: input.practitionerId } : {}),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.fromDate || input.toDate
        ? {
            session: {
              ...(input.fromDate
                ? { scheduledStartAt: { gte: new Date(input.fromDate) } }
                : {}),
              ...(input.toDate
                ? { scheduledStartAt: { lte: new Date(input.toDate) } }
                : {}),
            },
          }
        : {}),
      ...(input.search
        ? {
            OR: [
              { conversationRef: { contains: input.search, mode: 'insensitive' } },
              {
                session: {
                  sessionCode: {
                    contains: input.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                patient: {
                  OR: [
                    {
                      displayName: {
                        contains: input.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      user: {
                        displayName: {
                          contains: input.search,
                          mode: 'insensitive',
                        },
                      },
                    },
                    {
                      user: {
                        emails: {
                          some: {
                            email: { contains: input.search, mode: 'insensitive' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
              {
                practitioner: {
                  OR: [
                    {
                      user: {
                        displayName: {
                          contains: input.search,
                          mode: 'insensitive',
                        },
                      },
                    },
                    {
                      user: {
                        emails: {
                          some: {
                            email: { contains: input.search, mode: 'insensitive' },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            ],
          }
        : {}),
      ...(input.hasAttachmentsOnly
        ? {
            messages: {
              some: {
                deletedAt: null,
                visibility: MessageVisibility.NORMAL,
                attachments: {
                  some: {},
                },
              },
            },
          }
        : {}),
    };

    return where;
  }

  buildStatusWhere(status?: string): Prisma.ConversationWhereInput {
    if (!status) {
      return {};
    }

    switch (status) {
      case 'ACTIVE':
        return {
          status: {
            in: [ConversationStatus.OPEN, ConversationStatus.PENDING],
          },
          adminSendingDisabledAt: null,
          practitionerSendingDisabledAt: null,
        };
      case 'SENDING_DISABLED':
        return {
          adminSendingDisabledAt: { not: null },
        };
      case 'CLOSED_BY_PRACTITIONER':
        return {
          practitionerSendingDisabledAt: { not: null },
          adminSendingDisabledAt: null,
        };
      case 'ARCHIVED':
        return {
          status: {
            in: [
              ConversationStatus.CLOSED,
              ConversationStatus.EXPIRED,
              ConversationStatus.SUSPENDED,
            ],
          },
          adminSendingDisabledAt: null,
          practitionerSendingDisabledAt: null,
        };
      default:
        return {};
    }
  }

  extractAttachmentFileId(storageProvider: string | null, fileUrl: string) {
    if (storageProvider?.startsWith('ref:')) {
      return storageProvider.slice(4);
    }

    const urlSegments = fileUrl.split('/').filter(Boolean);
    return urlSegments[urlSegments.length - 1] ?? '';
  }
}
