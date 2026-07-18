import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class MessagingRealtimePublisher {
  private readonly logger = new Logger(MessagingRealtimePublisher.name);
  private server: Server | null = null;

  attachServer(server: Server) {
    this.server = server;
  }

  publishNewMessage(event: {
    conversationId: string;
    clientMessageId?: string;
    item: unknown;
  }) {
    if (!this.server) {
      this.logger.warn('Messaging realtime publisher is not attached yet');
      return false;
    }

    this.server
      .to(this.room(event.conversationId))
      .emit('messages:new', event);
    return true;
  }

  private room(conversationId: string) {
    return `messages:conversation:${conversationId}`;
  }
}
