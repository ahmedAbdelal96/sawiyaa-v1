import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionAdminDecisionType, SessionStatus } from '@prisma/client';

class AdminDecisionActorDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class AdminSessionManualDecisionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ enum: SessionAdminDecisionType })
  decisionType!: SessionAdminDecisionType;

  @ApiProperty({ enum: SessionStatus })
  previousSessionStatus!: SessionStatus;

  @ApiPropertyOptional({ enum: SessionStatus, nullable: true })
  nextSessionStatus!: SessionStatus | null;

  @ApiProperty()
  isFinal!: boolean;

  @ApiPropertyOptional({ nullable: true })
  supersedesDecisionId!: string | null;

  @ApiProperty()
  reasonCode!: string;

  @ApiPropertyOptional({ nullable: true })
  adminNote!: string | null;

  @ApiProperty({ type: AdminDecisionActorDto })
  decidedBy!: AdminDecisionActorDto;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true })
  recommendedOutcomeSnapshot!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  attendanceSummarySnapshot!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  evidenceTimelineSnapshot!: Record<string, unknown> | null;
}

export class AdminSessionManualDecisionDataResponseDto {
  @ApiProperty({ type: AdminSessionManualDecisionItemDto })
  item!: AdminSessionManualDecisionItemDto;
}

export class AdminSessionManualDecisionSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSessionManualDecisionDataResponseDto })
  data!: AdminSessionManualDecisionDataResponseDto;
}
