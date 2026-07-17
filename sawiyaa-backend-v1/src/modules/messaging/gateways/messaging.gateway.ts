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
import { Server, Socket } from 'socket.io';
import { AuthRequestContextService } from '@modules/auth/services/auth-request-context.service';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { MessagingUseCase } from '../use-cases/messaging.use-case';

type MessagingSocket = Socket & { data: { authenticatedUser?: AuthenticatedUser } };

@Injectable()
@WebSocketGateway({
  namespace: '/messages',
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayInit {
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly authRequestContextService: AuthRequestContextService,
    private readonly messaging: MessagingUseCase,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket: MessagingSocket, next) => {
      try {
        const token = this.extractAccessToken(socket);
        if (!token) return next(new Error('AUTH_REQUIRED'));
        const request = { headers: {}, body: {} } as AuthenticatedRequest;
        await this.authRequestContextService.attachUserToRequest(
          request,
          token,
          'access',
        );
        socket.data.authenticatedUser = request.user;
        next();
      } catch {
        next(new Error('AUTH_INVALID'));
      }
    });
  }

  async handleConnection(client: MessagingSocket) {
    if (client.data.authenticatedUser) return;
    client.disconnect();
  }

  @SubscribeMessage('messages:join')
  async join(
    @ConnectedSocket() client: MessagingSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    try {
      const actor = this.actor(client);
      await this.messaging.getConversation(actor, payload.conversationId);
      await client.join(this.room(payload.conversationId));
      return { ok: true, conversationId: payload.conversationId };
    } catch (error) {
      return this.failure(error);
    }
  }

  @SubscribeMessage('messages:leave')
  async leave(
    @ConnectedSocket() client: MessagingSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    try {
      const actor = this.actor(client);
      await this.messaging.getConversation(actor, payload.conversationId);
      await client.leave(this.room(payload.conversationId));
      return { ok: true, conversationId: payload.conversationId };
    } catch (error) {
      return this.failure(error);
    }
  }

  @SubscribeMessage('messages:send')
  async send(
    @ConnectedSocket() client: MessagingSocket,
    @MessageBody()
    payload: {
      conversationId: string;
      clientMessageId?: string;
      message: string;
      attachments?: Array<{
        fileId: string;
        fileUrl: string;
        mimeType: string;
        fileSize?: number;
        originalName?: string;
      }>;
    },
  ) {
    try {
      const actor = this.actor(client);
      const result = await this.messaging.sendMessage(
        actor,
        payload.conversationId,
        payload.message ?? '',
        payload.attachments ?? [],
      );
      const event = {
        conversationId: payload.conversationId,
        clientMessageId: payload.clientMessageId,
        item: result.item,
      };
      client.to(this.room(payload.conversationId)).emit('messages:new', event);
      return { ok: true, ...event };
    } catch (error) {
      return this.failure(error);
    }
  }

  @SubscribeMessage('messages:markRead')
  async markRead(
    @ConnectedSocket() client: MessagingSocket,
    @MessageBody() payload: { conversationId: string; lastReadMessageId: string },
  ) {
    try {
      const result = await this.messaging.markRead(
        this.actor(client),
        payload.conversationId,
        payload.lastReadMessageId,
      );
      this.server
        .to(this.room(payload.conversationId))
        .emit('messages:read', result.item);
      return { ok: true, ...result };
    } catch (error) {
      return this.failure(error);
    }
  }

  @SubscribeMessage('messages:typing:start')
  typingStart(
    @ConnectedSocket() client: MessagingSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    return this.emitTyping(client, payload, true);
  }

  @SubscribeMessage('messages:typing:stop')
  typingStop(
    @ConnectedSocket() client: MessagingSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    return this.emitTyping(client, payload, false);
  }

  private async emitTyping(
    client: MessagingSocket,
    payload: { conversationId: string },
    active: boolean,
  ) {
    try {
      await this.messaging.getConversation(this.actor(client), payload.conversationId);
      client.to(this.room(payload.conversationId)).emit(
        active ? 'messages:typing:start' : 'messages:typing:stop',
        { conversationId: payload.conversationId },
      );
      return { ok: true, conversationId: payload.conversationId };
    } catch (error) {
      return this.failure(error);
    }
  }

  private actor(client: MessagingSocket) {
    const actor = client.data.authenticatedUser;
    if (!actor) throw new Error('AUTH_REQUIRED');
    return actor;
  }

  private room(conversationId: string) {
    return `messages:conversation:${conversationId}`;
  }

  private extractAccessToken(client: Socket) {
    const auth = client.handshake.auth as { accessToken?: string } | undefined;
    const header = client.handshake.headers.authorization;
    return auth?.accessToken ?? (header?.startsWith('Bearer ') ? header.slice(7) : null);
  }

  private failure(error: unknown) {
    const exception = error as { response?: { errorCode?: string; messageKey?: string }; message?: string };
    this.logger.debug(`Messaging realtime action rejected: ${exception.message ?? 'unknown'}`);
    return {
      ok: false,
      code: exception.response?.errorCode ?? 'MESSAGING_ACTION_FAILED',
      message: exception.response?.messageKey ?? 'messages.errors.actionFailed',
    };
  }
}
