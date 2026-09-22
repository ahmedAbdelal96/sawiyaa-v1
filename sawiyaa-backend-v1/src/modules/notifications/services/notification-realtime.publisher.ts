import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export const NOTIFICATION_REALTIME_EVENT = 'notifications:new';

export type NotificationRealtimeEvent = {
  notificationId: string;
  typeSlug: string;
  relatedEntityType: string;
  relatedEntityId: string;
  createdAt: string;
};

@Injectable()
export class NotificationRealtimePublisher {
  private server: Server | null = null;

  attachServer(server: Server) {
    this.server = server;
  }

  publish(userId: string, event: NotificationRealtimeEvent) {
    this.server?.to(this.room(userId)).emit(NOTIFICATION_REALTIME_EVENT, event);
  }

  room(userId: string) {
    return `notifications:user:${userId}`;
  }
}
