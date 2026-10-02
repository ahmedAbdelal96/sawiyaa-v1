import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionResolutionPatientRemedy, SessionResolutionPractitionerRemedy, SessionStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export const ADMIN_RESOLUTION_FINDINGS = [
  'PATIENT_NO_SHOW',
  'PRACTITIONER_NO_SHOW',
  'BOTH_NO_SHOW',
  'SESSION_COMPLETED_AFTER_REVIEW',
  'TECHNICAL_ISSUE',
  'INSUFFICIENT_EVIDENCE',
  'OTHER',
] as const;
export type AdminResolutionFinding = (typeof ADMIN_RESOLUTION_FINDINGS)[number];

export class ExecuteAdminSessionResolutionDto {
  @ApiPropertyOptional({ enum: ADMIN_RESOLUTION_FINDINGS, description: 'Human finding. When omitted, attendanceOutcome is used for backward compatibility.' })
  @IsOptional()
  @IsString()
  findingCode?: AdminResolutionFinding;

  @ApiPropertyOptional({ enum: [SessionStatus.PATIENT_NO_SHOW, SessionStatus.PRACTITIONER_NO_SHOW, SessionStatus.BOTH_NO_SHOW] })
  @IsOptional()
  @IsEnum(SessionStatus)
  attendanceOutcome?: SessionStatus;

  @ApiProperty({ enum: SessionResolutionPatientRemedy })
  @IsEnum(SessionResolutionPatientRemedy)
  patientRemedy!: SessionResolutionPatientRemedy;

  @ApiProperty({ enum: SessionResolutionPractitionerRemedy })
  @IsEnum(SessionResolutionPractitionerRemedy)
  practitionerRemedy!: SessionResolutionPractitionerRemedy;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  reasonCode!: string;

  @ApiPropertyOptional({ maxLength: 2000, description: 'Required when findingCode is OTHER.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customReasonNote?: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  adminNotes!: string;

  @ApiProperty({ description: 'Stable idempotency key for this command.' })
  @IsString()
  @MaxLength(191)
  idempotencyKey!: string;

  @ApiPropertyOptional({ description: 'Hash returned by the side-effect-free preview. Execution rejects stale plans.' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  previewHash?: string;

  @ApiPropertyOptional({ description: 'Required for CREATE_REPLACEMENT_SESSION; must include an explicit timezone.' })
  @IsOptional()
  @IsDateString()
  replacementStartAt?: string;
}
