import { ApiProperty } from '@nestjs/swagger';
import { CredentialType, ReviewCaseStatus, ReviewRequirementSeverity, ReviewRequirementStatus, ReviewSection } from '@prisma/client';

export class PractitionerRequirementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ReviewSection }) section!: ReviewSection;
  @ApiProperty({ nullable: true }) fieldPath!: string | null;
  @ApiProperty({ enum: CredentialType, nullable: true }) credentialType!: CredentialType | null;
  @ApiProperty({ enum: ReviewRequirementStatus }) status!: ReviewRequirementStatus;
  @ApiProperty() title!: string;
  @ApiProperty() reason!: string;
  @ApiProperty({ nullable: true }) instructions!: string | null;
  @ApiProperty({ nullable: true }) requestedAt!: Date | null;
  @ApiProperty({ nullable: true }) dueAt!: Date | null;
  @ApiProperty({ enum: ReviewRequirementSeverity }) severity!: ReviewRequirementSeverity;
  @ApiProperty({ enum: ['NONE', 'BLOCK_PUBLIC_PROFILE', 'BLOCK_NEW_BOOKINGS', 'BLOCK_SESSIONS', 'BLOCK_PAYOUTS', 'SUSPEND_ACCOUNT'], isArray: true }) operationalImpact!: string[];
}

export class PractitionerRequirementsResponseDto {
  @ApiProperty({ nullable: true }) caseId!: string | null;
  @ApiProperty({ enum: ReviewCaseStatus, nullable: true }) caseStatus!: ReviewCaseStatus | null;
  @ApiProperty({ enum: ['ONBOARDING', 'PRACTITIONER_CHANGE'], nullable: true }) source!: 'ONBOARDING' | 'PRACTITIONER_CHANGE' | null;
  @ApiProperty({ type: PractitionerRequirementResponseDto, isArray: true }) requirements!: PractitionerRequirementResponseDto[];
}

export class PractitionerRequirementsSuccessResponseDto {
  @ApiProperty() message!: string;
  @ApiProperty({ type: PractitionerRequirementsResponseDto }) requirements!: PractitionerRequirementsResponseDto;
}
