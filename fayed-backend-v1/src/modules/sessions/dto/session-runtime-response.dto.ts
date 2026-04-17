import { ApiProperty } from '@nestjs/swagger';
import { SessionProvider, SessionStatus } from '@prisma/client';
import { SessionJoinBlockedReason } from '../types/session-video.types';

export class SessionRuntimeItemDto {
  @ApiProperty({ enum: SessionProvider })
  provider!: SessionProvider;

  @ApiProperty()
  isPrepared!: boolean;

  @ApiProperty({ nullable: true })
  roomName!: string | null;

  @ApiProperty({ nullable: true })
  roomUrl!: string | null;
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
    ],
  })
  blockedReason!: SessionJoinBlockedReason | null;

  @ApiProperty({ nullable: true })
  roomName!: string | null;

  @ApiProperty({ nullable: true })
  roomUrl!: string | null;

  @ApiProperty({ nullable: true })
  joinToken!: string | null;
}

export class SessionRuntimeItemDataResponseDto {
  @ApiProperty({ type: SessionRuntimeItemDto })
  item!: SessionRuntimeItemDto;
}

export class SessionJoinItemDataResponseDto {
  @ApiProperty({ type: SessionJoinItemDto })
  item!: SessionJoinItemDto;
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
