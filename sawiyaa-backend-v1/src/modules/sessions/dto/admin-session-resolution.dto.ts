import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionResolutionPatientRemedy, SessionResolutionPractitionerRemedy, SessionStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ExecuteAdminSessionResolutionDto {
  @ApiProperty({ enum: [SessionStatus.PATIENT_NO_SHOW, SessionStatus.PRACTITIONER_NO_SHOW, SessionStatus.BOTH_NO_SHOW] })
  @IsEnum(SessionStatus)
  attendanceOutcome!: SessionStatus;

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

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  adminNotes!: string;

  @ApiProperty({ description: 'Stable idempotency key for this command.' })
  @IsString()
  @MaxLength(191)
  idempotencyKey!: string;

  @ApiPropertyOptional({ description: 'Required for CREATE_REPLACEMENT_SESSION; must include an explicit timezone.' })
  @IsOptional()
  @IsDateString()
  replacementStartAt?: string;
}
