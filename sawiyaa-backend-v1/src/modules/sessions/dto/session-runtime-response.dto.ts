import { ApiProperty } from '@nestjs/swagger';
import { SessionProvider, SessionStatus } from '@prisma/client';
import { SessionJoinBlockedReason } from '../types/session-video.types';

export class SessionProviderRuntimeDto {
  @ApiProperty({ enum: SessionProvider })
  name!: SessionProvider;

  @ApiProperty({ nullable: true })
  roomId!: string | null;

  @ApiProperty({ nullable: true })
  roomUrl!: string | null;

  @ApiProperty({ nullable: true })
  token!: string | null;

  @ApiProperty({ nullable: true })
  tokenExpiresAt!: string | null;

  @ApiProperty({
    nullable: true,
    enum: ['redirect_url', 'embedded', 'external_url'],
  })
  joinMode!: 'redirect_url' | 'embedded' | 'external_url' | null;

  @ApiProperty({ type: Object })
  payload!: Record<string, unknown>;
}

export class SessionRuntimeItemDto {
  @ApiProperty({ enum: SessionProvider })
  provider!: SessionProvider;

  @ApiProperty()
  isPrepared!: boolean;

  @ApiProperty({ nullable: true })
  roomName!: string | null;

  @ApiProperty({ nullable: true })
  roomUrl!: string | null;

  @ApiProperty({ type: SessionProviderRuntimeDto, nullable: true })
  providerRuntime!: SessionProviderRuntimeDto | null;
}

export class SessionJoinItemDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty({ enum: SessionProvider })
  provider!: SessionProvider;

  @ApiProperty()
  canJoin!: boolean;

  @ApiProperty({
    nullable: true,
    enum: [
      'SESSION_NOT_JOINABLE_STATUS',
      'SESSION_NOT_VIDEO_MODE',
      'SESSION_TIME_WINDOW_NOT_OPEN',
      'SESSION_RUNTIME_NOT_PREPARED',
      'SESSION_JOIN_WINDOW_CLOSED',
      'SESSION_ROOM_CLOSED',
    ],
  })
  blockedReason!: SessionJoinBlockedReason | null;

  @ApiProperty({ nullable: true })
  roomName!: string | null;

  @ApiProperty({ nullable: true })
  roomUrl!: string | null;

  @ApiProperty({ nullable: true })
  joinToken!: string | null;

  @ApiProperty({ type: SessionProviderRuntimeDto })
  providerRuntime!: SessionProviderRuntimeDto;
}

export class SessionRoomCloseItemDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ enum: SessionProvider })
  provider!: SessionProvider;

  @ApiProperty()
  isClosed!: boolean;

  @ApiProperty()
  wasAlreadyClosed!: boolean;

  @ApiProperty({ nullable: true })
  roomName!: string | null;

  @ApiProperty({ nullable: true })
  roomUrl!: string | null;

  @ApiProperty({ nullable: true })
  closedAt!: string | null;

  @ApiProperty({ nullable: true })
  closeReason!: string | null;

  @ApiProperty({ nullable: true })
  closeNote!: string | null;
}

export class SessionRuntimeItemDataResponseDto {
  @ApiProperty({ type: SessionRuntimeItemDto })
  item!: SessionRuntimeItemDto;
}

export class SessionJoinItemDataResponseDto {
  @ApiProperty({ type: SessionJoinItemDto })
  item!: SessionJoinItemDto;
}

export class SessionRoomCloseItemDataResponseDto {
  @ApiProperty({ type: SessionRoomCloseItemDto })
  item!: SessionRoomCloseItemDto;
}

export class SessionRuntimeItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SessionRuntimeItemDataResponseDto })
  data!: SessionRuntimeItemDataResponseDto;
}

export class SessionJoinItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SessionJoinItemDataResponseDto })
  data!: SessionJoinItemDataResponseDto;
}

export class SessionRoomCloseItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SessionRoomCloseItemDataResponseDto })
  data!: SessionRoomCloseItemDataResponseDto;
}
