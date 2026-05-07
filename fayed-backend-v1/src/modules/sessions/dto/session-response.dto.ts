import { ApiProperty } from '@nestjs/swagger';
import { SessionMode, SessionStatus } from '@prisma/client';

export class SessionPractitionerSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class SessionPatientSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class SessionItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example: 'SES-2026-000123',
    description: 'Human-readable session reference code.',
  })
  sessionCode!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledEndAt!: string | null;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty({ enum: SessionMode })
  sessionMode!: SessionMode;

  @ApiProperty({ type: SessionPractitionerSummaryDto })
  practitioner!: SessionPractitionerSummaryDto;

  @ApiProperty({ type: SessionPatientSummaryDto, nullable: true })
  patient!: SessionPatientSummaryDto | null;
}

export class SessionDetailsResponseDto extends SessionItemResponseDto {
  @ApiProperty()
  flowType!: string;

  @ApiProperty({ nullable: true })
  expiresAt!: string | null;

  @ApiProperty({ nullable: true })
  cancelledAt!: string | null;

  @ApiProperty({ nullable: true })
  cancellationReason!: string | null;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty({ nullable: true })
  expiredAt!: string | null;

  @ApiProperty({ nullable: true })
  timezone!: string | null;
}

export class SessionsPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class SessionItemDataResponseDto {
  @ApiProperty({ type: SessionDetailsResponseDto })
  item!: SessionDetailsResponseDto;
}

export class SessionsListDataResponseDto {
  @ApiProperty({ type: SessionItemResponseDto, isArray: true })
  items!: SessionItemResponseDto[];

  @ApiProperty({ type: SessionsPaginationResponseDto })
  pagination!: SessionsPaginationResponseDto;
}

export class SessionItemSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SessionItemDataResponseDto })
  data!: SessionItemDataResponseDto;
}

export class SessionsListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: SessionsListDataResponseDto })
  data!: SessionsListDataResponseDto;
}
