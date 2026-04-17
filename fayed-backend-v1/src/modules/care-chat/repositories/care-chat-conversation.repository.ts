import { Injectable } from '@nestjs/common';
import {
  ConversationParticipantRole,
  ConversationStatus,
  MessageStatus,
  MessageType,
  MessageVisibility,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CareChatActorType } from '../types/care-chat.types';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CareChatConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createApprovedConversation(input: {
    patientId: string;
    patientUserId: string;
    practitionerId: string;
    practitionerUserId: string;
    sessionId?: string | null;
    requestId: string;
    expiresAt: Date | null;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).conversation.create({
      data: {
        conversationType: 'CARE_APPROVED',
        status: ConversationStatus.OPEN,
        patientId: input.patientId,
        practitionerId: input.practitionerId,
        sessionId: input.sessionId ?? null,
        chatApprovalRequestId: input.requestId,
        expiresAt: input.expiresAt,
        participants: {
          create: [
            {
              userId: input.patientUserId,
              participantRole: ConversationParticipantRole.PATIENT,
            },
            {
              userId: input.practitionerUserId,
              participantRole: ConversationParticipantRole.PRACTITIONER,
            },
          ],
        },
      },
      include: this.conversationDetailsInclude(),
    });
  }

  findByIdForActor(input: {
    conversationId: string;
    actorType: Exclude<CareChatActorType, 'ADMIN'>;
    profileId: string;
  }) {
    return this.prisma.conversation.findFirst({
      where: {
        id: input.conversationId,
        conversationType: 'CARE_APPROVED',
        ...(input.actorType === 'PATIENT'
          ? { patientId: input.profileId }
          : { practitionerId: input.profileId }),
      },
      include: this.conversationDetailsInclude(),
    });
  }

  findByIdForAdmin(conversationId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        conversationType: 'CARE_APPROVED',
      },
      include: this.conversationDetailsInclude(),
    });
  }

  async addMessage(input: {
    conversationId: string;
    senderUserId: string;
    senderRole: ConversationParticipantRole;
    message: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.message.create({
        data: {
          conversationId: input.conversationId,
          senderUserId: input.senderUserId,
          messageType: MessageType.TEXT,
          visibility: MessageVisibility.NORMAL,
          status: MessageStatus.SENT,
          contentText: input.message,
        },
      });

      return tx.conversation.findUniqueOrThrow({
        where: {
          id: input.conversationId,
        },
        include: this.conversationDetailsInclude(),
      });
    });
  }

  markRead(input: {
    conversationId: string;
    userId: string;
    lastReadMessageId?: string;
    at: Date;
  }) {
    return this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId: input.conversationId,
        userId: input.userId,
      },
      data: {
        lastReadAt: input.at,
        ...(input.lastReadMessageId
          ? { lastReadMessageId: input.lastReadMessageId }
          : {}),
      },
    });
  }

  updateConversationStatus(
    conversationId: string,
    data: Prisma.ConversationUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).conversation.update({
      where: { id: conversationId },
      data,
      include: this.conversationDetailsInclude(),
    });
  }

  private conversationDetailsInclude() {
    return {
      patient: {
        select: {
          id: true,
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
          user: {
            select: {
              displayName: true,
            },
          },
        },
      },
      chatApprovalRequest: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          relatedSessionId: true,
          revokedAt: true,
        },
      },
      messages: {
        where: {
          deletedAt: null,
          visibility: MessageVisibility.NORMAL,
        },
        orderBy: {
          sentAt: 'asc',
        },
        select: {
          id: true,
          senderUserId: true,
          contentText: true,
          sentAt: true,
          readAt: true,
        },
      },
      participants: {
        where: {
          isActive: true,
        },
        select: {
          userId: true,
          participantRole: true,
          lastReadAt: true,
        },
      },
    } as const;
  }
}
