import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { SessionProvider } from '@prisma/client';
import videoConfig from '@config/video.config';
import {
  SessionVideoJoinTokenResult,
  SessionVideoProviderAdapter,
  SessionVideoRoomResult,
} from './session-video-provider.interface';

type DailyRoomResponse = {
  name?: string;
  url?: string;
};

type DailyMeetingTokenResponse = {
  token?: string;
};

@Injectable()
export class DailySessionVideoProviderAdapter implements SessionVideoProviderAdapter {
  readonly provider = SessionProvider.DAILY;

  constructor(
    @Inject(videoConfig.KEY)
    private readonly videoCfg: ConfigType<typeof videoConfig>,
  ) {}

  private get dailyBaseUrl(): string {
    return this.videoCfg.daily.apiBaseUrl ?? 'https://api.daily.co/v1';
  }

  async createRoom(input: {
    sessionId: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<SessionVideoRoomResult> {
    this.assertConfigured();

    const roomName = `fayed-session-${input.sessionId}`;
    const response = await fetch(`${this.dailyBaseUrl}/rooms`, {
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

    if (!response.ok) {
      if (response.status === 409) {
        return {
          roomId: roomName,
          roomUrl: `https://${roomName}.daily.co`,
          roomName,
        };
      }

      throw new ServiceUnavailableException({
        messageKey: 'sessions.errors.videoProviderRoomCreationFailed',
        error: 'SESSION_VIDEO_PROVIDER_ROOM_CREATION_FAILED',
        messageParams: {
          provider: SessionProvider.DAILY,
        },
      });
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
          exp: Math.floor(Date.now() / 1000) + 3600,
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
      expiresAt: new Date(Date.now() + 3600 * 1000),
      joinMode: 'redirect_url',
      payload: {},
      raw: payload,
    };
  }

  private assertConfigured(): void {
    if (!this.videoCfg.daily.apiKey?.trim()) {
      throw new ServiceUnavailableException({
        messageKey: 'sessions.errors.videoProviderNotConfigured',
        error: 'SESSION_VIDEO_PROVIDER_NOT_CONFIGURED',
        messageParams: {
          provider: SessionProvider.DAILY,
        },
      });
    }
  }
}
