import {
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthRequestContextService } from '@modules/auth/services/auth-request-context.service';
import type { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import type { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { NotificationRealtimePublisher } from '../services/notification-realtime.publisher';

type NotificationSocket = Socket & {
  data: { authenticatedUser?: AuthenticatedUser };
};

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayInit {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly authRequestContextService: AuthRequestContextService,
    private readonly realtimePublisher: NotificationRealtimePublisher,
  ) {}

  afterInit(server: Server) {
    this.realtimePublisher.attachServer(server);
    server.use(async (socket: NotificationSocket, next) => {
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

  async handleConnection(client: NotificationSocket) {
    const user = client.data.authenticatedUser;
    if (!user) {
      this.logger.warn('Rejected unauthenticated notifications socket');
      client.disconnect();
      return;
    }

    await client.join(this.realtimePublisher.room(user.id));
  }

  private extractAccessToken(client: Socket): string | null {
    const auth = client.handshake.auth as
      | { accessToken?: unknown; token?: unknown }
      | undefined;
    const token = auth?.accessToken ?? auth?.token;
    if (typeof token === 'string' && token.trim()) return token;

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
      return authorization.slice(7);
    }

    return null;
  }
}
