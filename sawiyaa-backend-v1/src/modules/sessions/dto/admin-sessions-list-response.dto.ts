import { ApiProperty } from '@nestjs/swagger';
import { SessionMode, SessionStatus } from '@prisma/client';
import { SessionsPaginationResponseDto } from './session-response.dto';

export class AdminSessionListPractitionerSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class AdminSessionListPatientSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class AdminSessionListItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example: 'S-260729-0042',
    description: 'Human-readable session reference code.',
  })
  sessionCode!: string;

  @ApiProperty({ enum: SessionStatus })
  status!: SessionStatus;

  @ApiProperty({ nullable: true })
  scheduledStartAt!: string | null;

  @ApiProperty({ nullable: true })
  scheduledEndAt!: string | null;

  @ApiProperty()
  durationMinutes!: number;

  @ApiProperty({ enum: SessionMode })
  sessionMode!: SessionMode;

  @ApiProperty({ type: AdminSessionListPractitionerSummaryDto })
  practitioner!: AdminSessionListPractitionerSummaryDto;

  @ApiProperty({ type: AdminSessionListPatientSummaryDto, nullable: true })
  patient!: AdminSessionListPatientSummaryDto | null;

  @ApiProperty()
  isDelayed!: boolean;

  @ApiProperty({ nullable: true })
  reviewEnteredAt!: string | null;

  @ApiProperty({ nullable: true })
  queueAgeSeconds!: number | null;

  @ApiProperty({ type: Object })
  attendance!: {
    classification: SessionStatus | null;
    patientMinutes: number;
    practitionerMinutes: number;
    overlapMinutes: number;
    overlapPercent: number;
    confidence: string | null;
    status: string | null;
  };

  @ApiProperty()
  activeComplaintCount!: number;

  @ApiProperty()
  hasActiveComplaint!: boolean;

  @ApiProperty({ nullable: true })
  recommendation!: SessionStatus | null;

  @ApiProperty({ type: String, isArray: true })
  riskFlags!: string[];

  @ApiProperty({ nullable: true, type: Object })
  resolutionCase!: { status: string; openedAt: string } | null;
}

export class AdminSessionsListDataResponseDto {
  @ApiProperty({ type: AdminSessionListItemResponseDto, isArray: true })
  items!: AdminSessionListItemResponseDto[];

  @ApiProperty({ type: SessionsPaginationResponseDto })
  pagination!: SessionsPaginationResponseDto;
}

export class AdminSessionsListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AdminSessionsListDataResponseDto })
  data!: AdminSessionsListDataResponseDto;
}
