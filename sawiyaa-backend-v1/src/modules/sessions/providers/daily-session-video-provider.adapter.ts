import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { SessionProvider } from '@prisma/client';
import videoConfig from '@config/video.config';
import {
  SessionVideoJoinTokenResult,
  SessionVideoProviderAdapter,
  SessionVideoRoomCloseResult,
  SessionVideoRoomResult,
} from './session-video-provider.interface';

type DailyRoomResponse = {
  name?: string;
  url?: string;
};

type DailyMeetingTokenResponse = {
  token?: string;
};

type DailyDeleteRoomResponse = {
  deleted?: boolean;
  name?: string;
};

@Injectable()
export class DailySessionVideoProviderAdapter implements SessionVideoProviderAdapter {
  readonly provider = SessionProvider.DAILY;
  private readonly logger = new Logger(DailySessionVideoProviderAdapter.name);

  constructor(
    @Inject(videoConfig.KEY)
    private readonly videoCfg: ConfigType<typeof videoConfig>,
  ) {}

  private get dailyBaseUrl(): string {
    return this.videoCfg.daily.apiBaseUrl?.trim().replace(/\/+$/, '') ?? '';
  }

  async createRoom(input: {
    sessionId: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<SessionVideoRoomResult> {
    this.assertConfigured();

    const roomName = `fayed-session-${input.sessionId}`;
    let response: Response;
    try {
      response = await fetch(`${this.dailyBaseUrl}/rooms`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.videoCfg.daily.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roomName,
          privacy: 'private',
          properties: {
            exp: Math.floor(input.endsAt.getTime() / 1000) + 7200,
            eject_at_room_exp: true,
            enable_screenshare: true,
          },
        }),
      });
    } catch (error) {
      this.logTransportFailure('rooms', error);
      throw this.providerUnavailable('SESSION_VIDEO_PROVIDER_ROOM_CREATION_FAILED');
    }

    if (!response.ok) {
      if (response.status === 409) {
        return this.readExistingRoom(roomName);
      }

      await this.logProviderFailure('rooms', response);
      throw this.providerUnavailable('SESSION_VIDEO_PROVIDER_ROOM_CREATION_FAILED');
    }

    const payload = (await response.json()) as DailyRoomResponse;
    const resolvedRoomName = payload.name?.trim() || roomName;
    const resolvedRoomUrl =
      payload.url?.trim() || `https://${resolvedRoomName}.daily.co`;

    return {
      roomId: resolvedRoomName,
      roomUrl: resolvedRoomUrl,
      roomName: resolvedRoomName,
      raw: payload,
    };
  }

  async createJoinToken(input: {
    roomId: string;
    userId: string;
    displayName: string | null;
    actorType: 'PATIENT' | 'PRACTITIONER';
    expiresAt?: Date | null;
  }): Promise<SessionVideoJoinTokenResult> {
    this.assertConfigured();

    const response = await fetch(`${this.dailyBaseUrl}/meeting-tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.videoCfg.daily.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          room_name: input.roomId,
          user_id: input.userId,
          user_name: input.displayName ?? input.userId,
          is_owner: false,
          exp: Math.floor(
            Math.min(
              (input.expiresAt?.getTime() ?? Date.now() + 60 * 60_000) / 1000,
              (Date.now() + 2 * 60 * 60_000) / 1000,
            ),
          ),
        },
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException({
        messageKey: 'sessions.errors.videoProviderTokenGenerationFailed',
        error: 'SESSION_VIDEO_PROVIDER_TOKEN_GENERATION_FAILED',
        messageParams: {
          provider: SessionProvider.DAILY,
        },
      });
    }

    const payload = (await response.json()) as DailyMeetingTokenResponse;
    const token = payload.token?.trim();

    if (!token) {
      throw new ServiceUnavailableException({
        messageKey: 'sessions.errors.videoProviderTokenGenerationFailed',
        error: 'SESSION_VIDEO_PROVIDER_TOKEN_GENERATION_FAILED',
        messageParams: {
          provider: SessionProvider.DAILY,
        },
      });
    }

    return {
      token,
      expiresAt:
        input.expiresAt && input.expiresAt.getTime() > Date.now()
          ? input.expiresAt
          : new Date(Date.now() + 60 * 60_000),
      joinMode: 'redirect_url',
      payload: {},
      raw: payload,
    };
  }

  async closeRoom(input: {
    roomId: string;
  }): Promise<SessionVideoRoomCloseResult> {
    this.assertConfigured();

    const response = await fetch(
      `${this.dailyBaseUrl}/rooms/${encodeURIComponent(input.roomId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.videoCfg.daily.apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new ServiceUnavailableException({
        messageKey: 'sessions.errors.videoProviderRoomCloseFailed',
        error: 'SESSION_VIDEO_PROVIDER_ROOM_CLOSE_FAILED',
        messageParams: {
          provider: SessionProvider.DAILY,
        },
      });
    }

    const payload = (await response.json()) as DailyDeleteRoomResponse;

    if (payload.deleted !== true) {
      throw new ServiceUnavailableException({
        messageKey: 'sessions.errors.videoProviderRoomCloseFailed',
        error: 'SESSION_VIDEO_PROVIDER_ROOM_CLOSE_FAILED',
        messageParams: {
          provider: SessionProvider.DAILY,
        },
      });
    }

    return {
      closedAt: new Date(),
      raw: payload,
    };
  }

  private assertConfigured(): void {
    if (!this.videoCfg.daily.apiKey?.trim() || !this.dailyBaseUrl) {
      throw this.providerUnavailable('SESSION_VIDEO_PROVIDER_NOT_CONFIGURED', 'sessions.errors.videoProviderNotConfigured');
    }

    try {
      const parsed = new URL(this.dailyBaseUrl);
      if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.host) throw new Error('invalid-url');
    } catch {
      throw this.providerUnavailable('SESSION_VIDEO_PROVIDER_NOT_CONFIGURED', 'sessions.errors.videoProviderNotConfigured');
    }
  }

  private async readExistingRoom(roomName: string): Promise<SessionVideoRoomResult> {
    try {
      const response = await fetch(`${this.dailyBaseUrl}/rooms/${encodeURIComponent(roomName)}`, {
        headers: { Authorization: `Bearer ${this.videoCfg.daily.apiKey}` },
      });
      if (!response.ok) {
        await this.logProviderFailure('rooms/{roomName} after 409', response);
        throw new Error(`existing-room-${response.status}`);
      }
      const payload = (await response.json()) as DailyRoomResponse;
      const resolvedRoomName = payload.name?.trim() || roomName;
      const roomUrl = payload.url?.trim();
      if (!roomUrl) {
        this.logger.warn(JSON.stringify({
          event: 'dailyProviderSchemaMismatch',
          endpoint: 'rooms/{roomName}',
          missingField: 'url',
        }));
        throw new Error('existing-room-missing-url');
      }
      return {
        roomId: resolvedRoomName,
        roomUrl,
        roomName: resolvedRoomName,
        raw: payload,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logTransportFailure('rooms/{roomName} after 409', error);
      throw this.providerUnavailable('SESSION_VIDEO_PROVIDER_ROOM_CREATION_FAILED');
    }
  }

  private async logProviderFailure(endpoint: string, response: Response): Promise<void> {
    let providerCode: string | undefined;
    let providerMessageLength: number | undefined;
    try {
      const payload = (await response.clone().json()) as Record<string, unknown>;
      providerCode = typeof payload.error === 'string' ? payload.error : undefined;
      const providerMessage = typeof payload.info === 'string' ? payload.info :
        typeof payload.message === 'string' ? payload.message : undefined;
      providerMessageLength = providerMessage?.length;
    } catch {
      // Some provider failures are not JSON; status metadata is sufficient.
    }
    this.logger.warn(JSON.stringify({
      event: 'dailyProviderHttpFailure',
      endpoint,
      status: response.status,
      statusText: response.statusText,
      providerCode,
      providerMessageLength,
    }));
  }

  private logTransportFailure(endpoint: string, error: unknown): void {
    this.logger.warn(JSON.stringify({
      event: 'dailyProviderTransportFailure',
      endpoint,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message.slice(0, 240) : 'unknown',
    }));
  }

  private providerUnavailable(error: string, messageKey = 'sessions.errors.videoProviderRoomCreationFailed') {
    return new ServiceUnavailableException({
      messageKey,
      error,
      messageParams: { provider: SessionProvider.DAILY },
    });
  }
}
