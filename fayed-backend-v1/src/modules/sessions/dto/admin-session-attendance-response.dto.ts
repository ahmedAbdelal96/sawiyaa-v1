import { ApiProperty } from '@nestjs/swagger';
import {
  SessionAttendanceEventType,
  SessionAttendanceParticipantRole,
  SessionProvider,
} from '@prisma/client';

class AdminSessionAttendanceParticipantSummaryDto {
  @ApiProperty({ nullable: true })
  userId!: string | null;
}

class AdminSessionAttendanceTimelineItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ enum: SessionAttendanceEventType })
  attendanceEventType!: SessionAttendanceEventType;

  @ApiProperty({ enum: SessionAttendanceParticipantRole })
  participantRole!: SessionAttendanceParticipantRole;

  @ApiProperty({ type: AdminSessionAttendanceParticipantSummaryDto })
  participant!: AdminSessionAttendanceParticipantSummaryDto;

  @ApiProperty({ enum: SessionProvider })
  provider!: SessionProvider;

  @ApiProperty()
  providerEventType!: string;

  @ApiProperty({ nullable: true })
  providerEventRef!: string | null;

  @ApiProperty({ nullable: true })
  providerRoomRef!: string | null;

  @ApiProperty({ nullable: true })
  providerParticipantRef!: string | null;

  @ApiProperty()
  occurredAt!: string;

  @ApiProperty()
  ingestedAt!: string;
}

class AdminSessionAttendanceSummaryDto {
  @ApiProperty()
  patientHasJoined!: boolean;

  @ApiProperty()
  practitionerHasJoined!: boolean;

  @ApiProperty({ nullable: true })
  patientJoinedAt!: string | null;

  @ApiProperty({ nullable: true })
  practitionerJoinedAt!: string | null;

  @ApiProperty({ nullable: true })
  patientLeftAt!: string | null;

  @ApiProperty({ nullable: true })
  practitionerLeftAt!: string | null;

  @ApiProperty({ nullable: true })
  firstJoinedAt!: string | null;

  @ApiProperty({ nullable: true })
  lastLeftAt!: string | null;
}

class AdminSessionAttendanceDataResponseDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ type: AdminSessionAttendanceSummaryDto })
  summary!: AdminSessionAttendanceSummaryDto;

  @ApiProperty({ type: AdminSessionAttendanceTimelineItemDto, isArray: true })
  timeline!: AdminSessionAttendanceTimelineItemDto[];
}

export class AdminSessionAttendanceSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSessionAttendanceDataResponseDto })
  data!: AdminSessionAttendanceDataResponseDto;
}
