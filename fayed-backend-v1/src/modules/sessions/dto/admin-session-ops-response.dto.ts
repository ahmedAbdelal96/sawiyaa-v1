import { ApiProperty } from '@nestjs/swagger';
import { SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { SessionJoinBlockedReason } from '../types/session-video.types';

export class AdminSessionRuntimeInspectionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example: 'SES-2026-000123',
    description: 'Human-readable session reference code.',
  })
  sessionCode!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty({ enum: SessionMode })
  sessionMode!: SessionMode;

  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledEndAt!: string | null;

  @ApiProperty({ enum: SessionProvider })
  provider!: SessionProvider;

  @ApiProperty({ nullable: true })
  providerRoomId!: string | null;

  @ApiProperty({ nullable: true })
  providerSessionRef!: string | null;

  @ApiProperty()
  canPrepareRuntime!: boolean;

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
    ],
  })
  blockedReason!: SessionJoinBlockedReason | null;
}

export class AdminSessionRuntimeInspectionDataResponseDto {
  @ApiProperty({ type: AdminSessionRuntimeInspectionItemDto })
  item!: AdminSessionRuntimeInspectionItemDto;
}

export class AdminSessionRuntimeInspectionSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSessionRuntimeInspectionDataResponseDto })
  data!: AdminSessionRuntimeInspectionDataResponseDto;
}
