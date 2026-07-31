import { ApiProperty } from '@nestjs/swagger';
import { PractitionerApplicationCompletionResponseDto } from './practitioner-application-completion-response.dto';
import { ReviewCaseStatus, ReviewRequirementStatus } from '@prisma/client';

export class PractitionerProfessionalTitleReadinessResponseDto {
  @ApiProperty({ nullable: true })
  approvedValue!: string | null;

  @ApiProperty({ nullable: true })
  proposedValue!: string | null;

  @ApiProperty({ enum: ReviewRequirementStatus, nullable: true })
  requirementStatus!: ReviewRequirementStatus | null;

  @ApiProperty({ enum: ReviewCaseStatus, nullable: true })
  reviewStatus!: ReviewCaseStatus | null;

  @ApiProperty()
  publiclyComplete!: boolean;

  @ApiProperty()
  remediationComplete!: boolean;
}

export class PractitionerReadinessChecksResponseDto {
  @ApiProperty()
  hasDisplayName!: boolean;

  @ApiProperty()
  hasProfessionalTitle!: boolean;

  @ApiProperty()
  hasBio!: boolean;

  @ApiProperty()
  hasCountry!: boolean;

  @ApiProperty()
  hasYearsOfExperience!: boolean;

  @ApiProperty()
  hasLanguage!: boolean;

  @ApiProperty()
  hasSpecialty!: boolean;

  @ApiProperty()
  hasCredential!: boolean;

  @ApiProperty()
  isAccountActive!: boolean;

  @ApiProperty()
  isPractitionerOtpVerified!: boolean;
}

export class PractitionerProfileReadinessResponseDto {
  @ApiProperty()
  isProfileCompleted!: boolean;

  @ApiProperty()
  canSubmitApplication!: boolean;

  @ApiProperty({ type: [String] })
  missingRequirements!: string[];

  @ApiProperty({ type: [String] })
  remediationMissingRequirements!: string[];

  @ApiProperty({ type: PractitionerReadinessChecksResponseDto })
  checks!: PractitionerReadinessChecksResponseDto;

  @ApiProperty({ type: PractitionerProfessionalTitleReadinessResponseDto })
  professionalTitle!: PractitionerProfessionalTitleReadinessResponseDto;

  @ApiProperty({ type: PractitionerApplicationCompletionResponseDto })
  completion!: PractitionerApplicationCompletionResponseDto;
}

export class PractitionerProfileReadinessSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerProfileReadinessResponseDto })
  readiness!: PractitionerProfileReadinessResponseDto;
}
