import { Injectable } from '@nestjs/common';
import {
  ChatApprovalStatus,
  ConversationParticipantRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CareChatActorType } from '../types/care-chat.types';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CareChatRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createRequest(
    data: Prisma.ChatApprovalRequestUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).chatApprovalRequest.create({
      data,
      include: this.requestInclude(),
    });
  }

  findById(requestId: string) {
    return this.prisma.chatApprovalRequest.findUnique({
      where: { id: requestId },
      include: this.requestInclude(),
    });
  }

  findByIdForActor(input: {
    actorType: Exclude<CareChatActorType, 'ADMIN'>;
    profileId: string;
    requestId: string;
  }) {
    return this.prisma.chatApprovalRequest.findFirst({
      where: {
        id: input.requestId,
        ...(input.actorType === 'PATIENT'
          ? { patientId: input.profileId }
          : { practitionerId: input.profileId }),
      },
      include: this.requestInclude(),
    });
  }

  listByActor(input: {
    actorType: Exclude<CareChatActorType, 'ADMIN'>;
    profileId: string;
    page: number;
    limit: number;
    status?: ChatApprovalStatus;
  }) {
    const where: Prisma.ChatApprovalRequestWhereInput = {
      ...(input.actorType === 'PATIENT'
        ? { patientId: input.profileId }
        : { practitionerId: input.profileId }),
      ...(input.status ? { status: input.status } : {}),
    };
    const skip = (input.page - 1) * input.limit;

    return Promise.all([
      this.prisma.chatApprovalRequest.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ requestedAt: 'desc' }],
        include: this.requestInclude(),
      }),
      this.prisma.chatApprovalRequest.count({ where }),
    ]);
  }

  listForAdmin(input: {
    page: number;
    limit: number;
    status?: ChatApprovalStatus;
  }) {
    const where: Prisma.ChatApprovalRequestWhereInput = {
      ...(input.status ? { status: input.status } : {}),
    };
    const skip = (input.page - 1) * input.limit;
    return Promise.all([
      this.prisma.chatApprovalRequest.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ requestedAt: 'desc' }],
        include: this.requestInclude(),
      }),
      this.prisma.chatApprovalRequest.count({ where }),
    ]);
  }

  updateRequest(
    requestId: string,
    data: Prisma.ChatApprovalRequestUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).chatApprovalRequest.update({
      where: { id: requestId },
      data,
      include: this.requestInclude(),
    });
  }

  findExistingActiveBetweenActors(input: {
    patientId: string;
    practitionerId: string;
    now: Date;
  }) {
    return this.prisma.chatApprovalRequest.findFirst({
      where: {
        patientId: input.patientId,
        practitionerId: input.practitionerId,
        status: {
          in: [ChatApprovalStatus.PENDING, ChatApprovalStatus.APPROVED],
        },
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: input.now,
            },
          },
        ],
      },
      orderBy: [{ requestedAt: 'desc' }],
      select: {
        id: true,
        status: true,
      },
    });
  }

  createModerationAction(input: {
    requestId: string;
    conversationId?: string | null;
    actedByUserId: string;
    actionNote?: string | null;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).chatModerationAction.create({
      data: {
        chatApprovalRequestId: input.requestId,
        conversationId: input.conversationId ?? null,
        actedByUserId: input.actedByUserId,
        actionType: 'APPROVAL_REVOKED',
        actionNote: input.actionNote ?? null,
      },
    });
  }

  withTransaction<T>(
    runner: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction((tx) => runner(tx));
  }

  private requestInclude() {
    return {
      patient: {
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              displayName: true,
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
            },
          },
        },
      },
      linkedConversation: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          closedAt: true,
        },
      },
    } as const;
  }

  createApprovalNoticeMessage(
    input: {
      conversationId: string;
      actorRole: ConversationParticipantRole;
      message: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).message.create({
      data: {
        conversationId: input.conversationId,
        senderUserId: null,
        messageType: 'APPROVAL_NOTICE',
        visibility: 'NORMAL',
        contentText: input.message,
      },
    });
  }
}
