import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { Server, Socket } from 'socket.io';
import { AuthRequestContextService } from '@modules/auth/services/auth-request-context.service';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CareChatConversationRepository } from '@modules/care-chat/repositories/care-chat-conversation.repository';
import { SendCareChatMessageUseCase } from '@modules/care-chat/use-cases/send-care-chat-message.use-case';
import { AddAdminSupportMessageUseCase } from '@modules/support/use-cases/add-admin-support-message.use-case';
import { AddMySupportMessageUseCase } from '@modules/support/use-cases/add-my-support-message.use-case';
import { SupportTicketRepository } from '@modules/support/repositories/support-ticket.repository';
import { SendGeneralChatMessageUseCase } from '../use-cases/send-general-chat-message.use-case';
import { MarkMyGeneralChatConversationReadUseCase } from '../use-cases/mark-my-general-chat-conversation-read.use-case';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { GeneralChatAttachmentRefDto } from '../dto/send-general-chat-message.dto';

type GeneralChatSocket = Socket;

type JoinPayload = {
  conversationId: string;
};

type LeavePayload = {
  conversationId: string;
};

type SendPayload = {
  conversationId: string;
  clientMessageId: string;
  message: string;
  attachments?: GeneralChatAttachmentRefDto[];
};

type MarkReadPayload = {
  conversationId: string;
  lastReadMessageId: string;
};
type TypingPayload = {
  conversationId: string;
};

type SupportJoinPayload = {
  ticketId: string;
};

type SupportSendPayload = {
  ticketId: string;
  clientMessageId: string;
  message: string;
};

type SupportMarkReadPayload = {
  ticketId: string;
  lastReadMessageId: string;
};
type SupportTypingPayload = {
  ticketId: string;
};

type CareJoinPayload = {
  conversationId: string;
};

type CareSendPayload = {
  conversationId: string;
  clientMessageId: string;
  message: string;
};

type CareMarkReadPayload = {
  conversationId: string;
  lastReadMessageId: string;
};
type CareTypingPayload = {
  conversationId: string;
};

type AckSuccess = {
  ok: true;
  conversationId: string;
  clientMessageId?: string;
  item?: unknown;
};

type AckFailure = {
  ok: false;
  code: string;
  message: string;
};

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class GeneralChatGateway implements OnGatewayConnection, OnGatewayInit {
  private readonly logger = new Logger(GeneralChatGateway.name);
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly authRequestContextService: AuthRequestContextService,
    private readonly generalChatRepository: GeneralChatRepository,
    private readonly sendGeneralChatMessageUseCase: SendGeneralChatMessageUseCase,
    private readonly markMyGeneralChatConversationReadUseCase: MarkMyGeneralChatConversationReadUseCase,
    private readonly careChatConversationRepository: CareChatConversationRepository,
    private readonly sendCareChatMessageUseCase: SendCareChatMessageUseCase,
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly addMySupportMessageUseCase: AddMySupportMessageUseCase,
    private readonly addAdminSupportMessageUseCase: AddAdminSupportMessageUseCase,
  ) {}

  afterInit(server: Server) {
    // Authenticate sockets as a Socket.IO middleware so "connect" only means "connected + authenticated".
    // This avoids a race where the client emits join/markRead immediately after connect but
    // handleConnection has not finished attaching the user yet.
    server.use(async (socket: GeneralChatSocket, next) => {
      try {
        const accessToken = this.extractAccessToken(socket);
        if (!accessToken) {
          next(new Error('AUTH_REQUIRED'));
          return;
        }

        const request = {
          headers: {},
          body: {},
        } as AuthenticatedRequest;

        await this.authRequestContextService.attachUserToRequest(
          request,
          accessToken,
          'access',
        );

        const socketData = socket.data as {
          authenticatedUser?: AuthenticatedUser;
        };
        socketData.authenticatedUser = request.user;
        next();
      } catch {
        next(new Error('AUTH_INVALID'));
      }
    });
  }

  async handleConnection(client: GeneralChatSocket) {
    try {
      const existing = client.data as { authenticatedUser?: AuthenticatedUser };
      if (existing.authenticatedUser) {
        return;
      }

      const accessToken = this.extractAccessToken(client);
      if (!accessToken) {
        client.emit('chat:error', {
          code: 'AUTH_REQUIRED',
          message: 'Authentication is required',
        });
        client.disconnect();
        return;
      }

      const request = {
        headers: {},
        body: {},
      } as AuthenticatedRequest;

      await this.authRequestContextService.attachUserToRequest(
        request,
        accessToken,
        'access',
      );

      const socketData = client.data as {
        authenticatedUser?: AuthenticatedUser;
      };
      socketData.authenticatedUser = request.user;
    } catch (error) {
      this.logger.debug(
        `Rejected realtime connection: ${(error as Error).message}`,
      );
      client.emit('chat:error', {
        code: 'AUTH_INVALID',
        message: 'Authentication is invalid',
      });
      client.disconnect();
    }
  }

  @SubscribeMessage('chat:join')
  async onJoin(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: JoinPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertSessionConversationAccess(
        payload.conversationId,
        actor.id,
      );

      await client.join(this.room(payload.conversationId));

      const deliveredOnJoin =
        await this.generalChatRepository.markConversationMessagesDeliveredForRecipient(
          {
            conversationId: payload.conversationId,
            recipientUserId: actor.id,
            deliveredAt: new Date(),
          },
        );

      for (const delivered of deliveredOnJoin) {
        this.server
          .to(this.room(delivered.conversationId))
          .emit('chat:delivered', delivered);
      }

      return {
        ok: true,
        conversationId: payload.conversationId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:leave')
  async onLeave(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: LeavePayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertSessionConversationAccess(
        payload.conversationId,
        actor.id,
      );

      await client.leave(this.room(payload.conversationId));

      return {
        ok: true,
        conversationId: payload.conversationId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:send')
  async onSend(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: SendPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertSessionConversationAccess(
        payload.conversationId,
        actor.id,
      );

      const result = await this.sendGeneralChatMessageUseCase.execute({
        authenticatedUser: actor,
        conversationId: payload.conversationId,
        dto: {
          message: payload.message,
          attachments: payload.attachments ?? [],
        },
      });

      const eventPayload = {
        conversationId: payload.conversationId,
        item: result.item,
      };

      client
        .to(this.room(payload.conversationId))
        .emit('chat:newMessage', eventPayload);

      const hasOtherParticipantConnected = await this.hasOtherParticipantInRoom(
        payload.conversationId,
        actor.id,
      );

      if (hasOtherParticipantConnected) {
        const delivered = await this.generalChatRepository.markMessageDelivered(
          {
            conversationId: payload.conversationId,
            messageId: result.item.messageId,
            deliveredAt: new Date(),
          },
        );

        if (delivered?.deliveredAt) {
          const deliveredEvent = {
            conversationId: delivered.conversationId,
            messageId: delivered.id,
            deliveredAt: delivered.deliveredAt.toISOString(),
          };

          this.server
            .to(this.room(payload.conversationId))
            .emit('chat:delivered', deliveredEvent);

          result.item.status = 'DELIVERED';
          result.item.deliveredAt = delivered.deliveredAt.toISOString();
        }
      }

      return {
        ok: true,
        conversationId: payload.conversationId,
        clientMessageId: payload.clientMessageId,
        item: result.item,
      };
    } catch (error) {
      const failure = this.toAckFailure(error);
      client.emit('chat:error', {
        code: failure.code,
        message: failure.message,
        conversationId: payload.conversationId,
      });
      return failure;
    }
  }

  @SubscribeMessage('chat:markRead')
  async onMarkRead(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: MarkReadPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertSessionConversationAccess(
        payload.conversationId,
        actor.id,
      );

      const result =
        await this.markMyGeneralChatConversationReadUseCase.execute({
          authenticatedUser: actor,
          conversationId: payload.conversationId,
          dto: {
            lastReadMessageId: payload.lastReadMessageId,
          },
        });

      if (result.item.lastReadMessageId && result.item.lastReadAt) {
        this.server.to(this.room(payload.conversationId)).emit('chat:read', {
          conversationId: payload.conversationId,
          lastReadMessageId: result.item.lastReadMessageId,
          readAt: result.item.lastReadAt,
          userId: actor.id,
        });
      }

      return {
        ok: true,
        conversationId: payload.conversationId,
        item: result.item,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:typing:start')
  async onTypingStart(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: TypingPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertSessionConversationAccess(
        payload.conversationId,
        actor.id,
      );

      client.to(this.room(payload.conversationId)).emit('chat:typing:start', {
        conversationId: payload.conversationId,
        userId: actor.id,
      });

      return {
        ok: true,
        conversationId: payload.conversationId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:typing:stop')
  async onTypingStop(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: TypingPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertSessionConversationAccess(
        payload.conversationId,
        actor.id,
      );

      client.to(this.room(payload.conversationId)).emit('chat:typing:stop', {
        conversationId: payload.conversationId,
        userId: actor.id,
      });

      return {
        ok: true,
        conversationId: payload.conversationId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:support:join')
  async onSupportJoin(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: SupportJoinPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      const ticket = await this.assertSupportTicketAccess(
        payload.ticketId,
        actor,
      );

      await client.join(this.supportRoom(payload.ticketId));

      const deliveredOnJoin =
        await this.supportTicketRepository.markSupportMessagesDeliveredForRecipient(
          {
            conversationId: ticket.conversationId,
            recipientUserId: actor.id,
            deliveredAt: new Date(),
          },
        );

      for (const delivered of deliveredOnJoin) {
        this.server
          .to(this.supportRoom(payload.ticketId))
          .emit('chat:support:delivered', {
            ticketId: payload.ticketId,
            messageId: delivered.messageId,
            deliveredAt: delivered.deliveredAt.toISOString(),
          });
      }

      return {
        ok: true,
        conversationId: payload.ticketId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:support:leave')
  async onSupportLeave(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: SupportJoinPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertSupportTicketAccess(payload.ticketId, actor);
      await client.leave(this.supportRoom(payload.ticketId));
      return {
        ok: true,
        conversationId: payload.ticketId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:support:send')
  async onSupportSend(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: SupportSendPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      const ticket = await this.assertSupportTicketAccess(
        payload.ticketId,
        actor,
      );
      const normalizedMessage = payload.message.trim();
      if (!normalizedMessage) {
        throw new Error('SUPPORT_MESSAGE_REQUIRED');
      }

      const detail = await this.sendSupportMessageByActor({
        actor,
        ticketId: payload.ticketId,
        message: normalizedMessage,
      });

      const message = detail.messages[detail.messages.length - 1];
      if (!message) {
        throw new Error('SUPPORT_MESSAGE_NOT_FOUND');
      }

      const hasOtherParticipantConnected =
        await this.hasOtherSupportParticipantInRoom(payload.ticketId, actor.id);

      let deliveredAt = message.deliveredAt;
      let status = message.status;

      if (hasOtherParticipantConnected) {
        const delivered =
          await this.supportTicketRepository.markSupportMessageDelivered({
            conversationId: ticket.conversationId,
            messageId: message.id,
            deliveredAt: new Date(),
          });

        if (delivered?.deliveredAt) {
          deliveredAt = delivered.deliveredAt.toISOString();
          status = 'DELIVERED';
        }
      }

      const item = {
        ...message,
        status,
        deliveredAt,
      };

      this.server
        .to(this.supportRoom(payload.ticketId))
        .emit('chat:support:newMessage', {
          ticketId: payload.ticketId,
          item,
        });

      if (status === 'DELIVERED' && deliveredAt) {
        this.server
          .to(this.supportRoom(payload.ticketId))
          .emit('chat:support:delivered', {
            ticketId: payload.ticketId,
            messageId: message.id,
            deliveredAt,
          });
      }

      return {
        ok: true,
        conversationId: payload.ticketId,
        clientMessageId: payload.clientMessageId,
        item,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:support:markRead')
  async onSupportMarkRead(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: SupportMarkReadPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      const ticket = await this.assertSupportTicketAccess(
        payload.ticketId,
        actor,
      );

      const readTarget =
        await this.supportTicketRepository.findSupportMessageInConversation({
          conversationId: ticket.conversationId,
          messageId: payload.lastReadMessageId,
        });

      if (!readTarget) {
        throw new Error('SUPPORT_MESSAGE_NOT_FOUND');
      }

      if (readTarget.senderUserId !== actor.id) {
        const now = new Date();
        await this.supportTicketRepository.markSupportConversationReadCursor({
          conversationId: ticket.conversationId,
          userId: actor.id,
          lastReadMessageId: readTarget.id,
          lastReadAt: now,
        });
        await this.supportTicketRepository.markSupportMessagesReadForRecipient({
          conversationId: ticket.conversationId,
          recipientUserId: actor.id,
          lastReadMessageSentAt: readTarget.sentAt,
          readAt: now,
        });

        this.server
          .to(this.supportRoom(payload.ticketId))
          .emit('chat:support:read', {
            ticketId: payload.ticketId,
            lastReadMessageId: readTarget.id,
            readAt: now.toISOString(),
            userId: actor.id,
          });
      }

      return {
        ok: true,
        conversationId: payload.ticketId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:support:typing:start')
  async onSupportTypingStart(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: SupportTypingPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertSupportTicketAccess(payload.ticketId, actor);

      client
        .to(this.supportRoom(payload.ticketId))
        .emit('chat:support:typing:start', {
          ticketId: payload.ticketId,
          userId: actor.id,
        });

      return {
        ok: true,
        conversationId: payload.ticketId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:support:typing:stop')
  async onSupportTypingStop(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: SupportTypingPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertSupportTicketAccess(payload.ticketId, actor);

      client
        .to(this.supportRoom(payload.ticketId))
        .emit('chat:support:typing:stop', {
          ticketId: payload.ticketId,
          userId: actor.id,
        });

      return {
        ok: true,
        conversationId: payload.ticketId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:care:join')
  async onCareJoin(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: CareJoinPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertCareConversationAccess(payload.conversationId, actor.id);

      await client.join(this.careRoom(payload.conversationId));

      const deliveredOnJoin =
        await this.careChatConversationRepository.markCareMessagesDeliveredForRecipient(
          {
            conversationId: payload.conversationId,
            recipientUserId: actor.id,
            deliveredAt: new Date(),
          },
        );

      for (const delivered of deliveredOnJoin) {
        this.server
          .to(this.careRoom(payload.conversationId))
          .emit('chat:care:delivered', {
            conversationId: payload.conversationId,
            messageId: delivered.messageId,
            deliveredAt: delivered.deliveredAt.toISOString(),
          });
      }

      return {
        ok: true,
        conversationId: payload.conversationId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:care:leave')
  async onCareLeave(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: CareJoinPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertCareConversationAccess(payload.conversationId, actor.id);
      await client.leave(this.careRoom(payload.conversationId));
      return {
        ok: true,
        conversationId: payload.conversationId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:care:send')
  async onCareSend(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: CareSendPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertCareConversationAccess(payload.conversationId, actor.id);
      const normalizedMessage = payload.message.trim();
      if (!normalizedMessage) {
        throw new Error('CARE_CHAT_MESSAGE_REQUIRED');
      }

      const detail = await this.sendCareMessageByActor({
        actor,
        conversationId: payload.conversationId,
        message: normalizedMessage,
      });

      const message = detail.messages[detail.messages.length - 1];
      if (!message) {
        throw new Error('CARE_CHAT_MESSAGE_NOT_FOUND');
      }

      const hasOtherParticipantConnected =
        await this.hasOtherCareParticipantInRoom(
          payload.conversationId,
          actor.id,
        );

      let deliveredAt = message.deliveredAt;
      let status = message.status;

      if (hasOtherParticipantConnected) {
        const delivered =
          await this.careChatConversationRepository.markCareMessageDelivered({
            conversationId: payload.conversationId,
            messageId: message.id,
            deliveredAt: new Date(),
          });

        if (delivered?.deliveredAt) {
          deliveredAt = delivered.deliveredAt.toISOString();
          status = 'DELIVERED';
        }
      }

      const item = {
        ...message,
        status,
        deliveredAt,
      };

      this.server
        .to(this.careRoom(payload.conversationId))
        .emit('chat:care:newMessage', {
          conversationId: payload.conversationId,
          item,
        });

      if (status === 'DELIVERED' && deliveredAt) {
        this.server
          .to(this.careRoom(payload.conversationId))
          .emit('chat:care:delivered', {
            conversationId: payload.conversationId,
            messageId: message.id,
            deliveredAt,
          });
      }

      return {
        ok: true,
        conversationId: payload.conversationId,
        clientMessageId: payload.clientMessageId,
        item,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:care:markRead')
  async onCareMarkRead(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: CareMarkReadPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertCareConversationAccess(payload.conversationId, actor.id);

      const readTarget =
        await this.careChatConversationRepository.findCareMessageInConversation(
          {
            conversationId: payload.conversationId,
            messageId: payload.lastReadMessageId,
          },
        );

      if (!readTarget) {
        throw new Error('CARE_CHAT_MESSAGE_NOT_FOUND');
      }

      if (readTarget.senderUserId !== actor.id) {
        const now = new Date();
        await this.careChatConversationRepository.markCareConversationReadCursor(
          {
            conversationId: payload.conversationId,
            userId: actor.id,
            lastReadMessageId: readTarget.id,
            lastReadAt: now,
          },
        );
        await this.careChatConversationRepository.markCareMessagesReadForRecipient(
          {
            conversationId: payload.conversationId,
            recipientUserId: actor.id,
            lastReadMessageSentAt: readTarget.sentAt,
            readAt: now,
          },
        );

        this.server
          .to(this.careRoom(payload.conversationId))
          .emit('chat:care:read', {
            conversationId: payload.conversationId,
            lastReadMessageId: readTarget.id,
            readAt: now.toISOString(),
            userId: actor.id,
          });
      }

      return {
        ok: true,
        conversationId: payload.conversationId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:care:typing:start')
  async onCareTypingStart(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: CareTypingPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertCareConversationAccess(payload.conversationId, actor.id);

      client
        .to(this.careRoom(payload.conversationId))
        .emit('chat:care:typing:start', {
          conversationId: payload.conversationId,
          userId: actor.id,
        });

      return {
        ok: true,
        conversationId: payload.conversationId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  @SubscribeMessage('chat:care:typing:stop')
  async onCareTypingStop(
    @ConnectedSocket() client: GeneralChatSocket,
    @MessageBody() payload: CareTypingPayload,
  ): Promise<AckSuccess | AckFailure> {
    try {
      const actor = this.requireAuthenticatedUser(client);
      await this.assertCareConversationAccess(payload.conversationId, actor.id);

      client
        .to(this.careRoom(payload.conversationId))
        .emit('chat:care:typing:stop', {
          conversationId: payload.conversationId,
          userId: actor.id,
        });

      return {
        ok: true,
        conversationId: payload.conversationId,
      };
    } catch (error) {
      return this.toAckFailure(error);
    }
  }

  private requireAuthenticatedUser(
    client: GeneralChatSocket,
  ): AuthenticatedUser {
    const socketData = client.data as { authenticatedUser?: AuthenticatedUser };
    const actor = socketData.authenticatedUser;
    if (!actor) {
      throw new Error('AUTH_REQUIRED');
    }
    return actor;
  }

  private async assertSessionConversationAccess(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation =
      await this.generalChatRepository.findConversationByIdInGeneralScope(
        conversationId,
      );

    if (!conversation) {
      throw new Error('CONVERSATION_NOT_FOUND');
    }

    if (!conversation.sessionId) {
      throw new Error('CONVERSATION_NOT_SESSION_SCOPED');
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.userId === userId,
    );
    if (!isParticipant) {
      throw new Error('CONVERSATION_ACCESS_DENIED');
    }
  }

  private extractAccessToken(client: GeneralChatSocket): string | null {
    const authPayload = client.handshake.auth as
      | Record<string, unknown>
      | undefined;
    const authToken = authPayload?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken;
    }

    const authorization = client.handshake.headers.authorization;
    if (
      typeof authorization === 'string' &&
      authorization.startsWith('Bearer ')
    ) {
      return authorization.slice(7);
    }

    return null;
  }

  private room(conversationId: string) {
    return `conversation:${conversationId}`;
  }

  private supportRoom(ticketId: string) {
    return `support-ticket:${ticketId}`;
  }

  private careRoom(conversationId: string) {
    return `care-conversation:${conversationId}`;
  }

  private async hasOtherParticipantInRoom(
    conversationId: string,
    currentUserId: string,
  ) {
    const sockets = await this.server
      .in(this.room(conversationId))
      .fetchSockets();
    return sockets.some((socket) => {
      const socketData = socket.data as {
        authenticatedUser?: AuthenticatedUser;
      };
      const userId = socketData.authenticatedUser?.id;
      return Boolean(userId && userId !== currentUserId);
    });
  }

  private async hasOtherSupportParticipantInRoom(
    ticketId: string,
    currentUserId: string,
  ) {
    const sockets = await this.server
      .in(this.supportRoom(ticketId))
      .fetchSockets();
    return sockets.some((socket) => {
      const socketData = socket.data as {
        authenticatedUser?: AuthenticatedUser;
      };
      const userId = socketData.authenticatedUser?.id;
      return Boolean(userId && userId !== currentUserId);
    });
  }

  private async hasOtherCareParticipantInRoom(
    conversationId: string,
    currentUserId: string,
  ) {
    const sockets = await this.server
      .in(this.careRoom(conversationId))
      .fetchSockets();
    return sockets.some((socket) => {
      const socketData = socket.data as {
        authenticatedUser?: AuthenticatedUser;
      };
      const userId = socketData.authenticatedUser?.id;
      return Boolean(userId && userId !== currentUserId);
    });
  }

  private async assertSupportTicketAccess(
    ticketId: string,
    actor: AuthenticatedUser,
  ) {
    const ticket =
      await this.supportTicketRepository.canUserAccessSupportTicket({
        ticketId,
        userId: actor.id,
        roles: actor.roles,
      });

    if (!ticket) {
      throw new Error('SUPPORT_TICKET_ACCESS_DENIED');
    }

    return ticket;
  }

  private async assertCareConversationAccess(
    conversationId: string,
    userId: string,
  ) {
    const conversation =
      await this.careChatConversationRepository.findByIdWithParticipants(
        conversationId,
      );

    if (!conversation) {
      throw new Error('CARE_CHAT_CONVERSATION_NOT_FOUND');
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.userId === userId,
    );

    if (!isParticipant) {
      throw new Error('CARE_CHAT_CONVERSATION_ACCESS_DENIED');
    }

    return conversation;
  }

  private async sendCareMessageByActor(input: {
    actor: AuthenticatedUser;
    conversationId: string;
    message: string;
  }) {
    const actorType = input.actor.roles.includes(AppRole.PRACTITIONER)
      ? 'PRACTITIONER'
      : 'PATIENT';

    const result = await this.sendCareChatMessageUseCase.execute({
      actorType,
      userId: input.actor.id,
      conversationId: input.conversationId,
      payload: { message: input.message },
    });

    return result.item;
  }

  private async sendSupportMessageByActor(input: {
    actor: AuthenticatedUser;
    ticketId: string;
    message: string;
  }) {
    const isAdminLike =
      input.actor.roles.includes(AppRole.ADMIN) ||
      input.actor.roles.includes(AppRole.SUPPORT_AGENT);

    if (isAdminLike) {
      const result = await this.addAdminSupportMessageUseCase.execute({
        userId: input.actor.id,
        roles: input.actor.roles,
        ticketId: input.ticketId,
        payload: { message: input.message },
      });

      return result.item;
    }

    const actorKind = input.actor.roles.includes(AppRole.PRACTITIONER)
      ? 'PRACTITIONER'
      : 'PATIENT';

    const result = await this.addMySupportMessageUseCase.execute({
      actorKind,
      userId: input.actor.id,
      ticketId: input.ticketId,
      payload: { message: input.message },
    });

    return result.item;
  }

  private toAckFailure(error: unknown): AckFailure {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return {
      ok: false,
      code,
      message: 'Chat realtime operation failed',
    };
  }
}
