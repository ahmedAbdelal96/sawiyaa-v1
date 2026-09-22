import { ApiProperty } from '@nestjs/swagger';
import { PractitionerApplicationCompletionResponseDto } from './practitioner-application-completion-response.dto';
import { PractitionerPayoutMethodType, ReviewCaseStatus, ReviewRequirementStatus } from '@prisma/client';

export class PractitionerPayoutCapabilityResponseDto {
  @ApiProperty({ enum: PractitionerPayoutMethodType })
  methodType!: PractitionerPayoutMethodType;

  @ApiProperty()
  semanticKey!: string;

  @ApiProperty({ type: [String], nullable: true })
  countryCodes!: string[] | null;

  @ApiProperty({ type: [String] })
  requiredFields!: string[];

  @ApiProperty({ type: [String] })
  optionalFields!: string[];

  @ApiProperty()
  providerIntegration!: false;
}

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
  isApproved!: boolean;

  @ApiProperty()
  isProfileComplete!: boolean;

  @ApiProperty()
  hasRequiredSpecialty!: boolean;

  @ApiProperty()
  hasRequiredNormalPricing!: boolean;

  @ApiProperty()
  canPublish!: boolean;

  @ApiProperty()
  isProfileCompleted!: boolean;

  @ApiProperty()
  canSubmitApplication!: boolean;

  @ApiProperty({ type: [String] })
  missingRequirements!: string[];

  @ApiProperty({ type: [String] })
  remediationMissingRequirements!: string[];

  @ApiProperty({ type: [String] })
  publicationMissingRequirements!: string[];

  @ApiProperty({ type: PractitionerReadinessChecksResponseDto })
  checks!: PractitionerReadinessChecksResponseDto;

  @ApiProperty({ type: PractitionerProfessionalTitleReadinessResponseDto })
  professionalTitle!: PractitionerProfessionalTitleReadinessResponseDto;

  @ApiProperty({ type: PractitionerApplicationCompletionResponseDto })
  completion!: PractitionerApplicationCompletionResponseDto;

  @ApiProperty({ type: [PractitionerPayoutCapabilityResponseDto] })
  payoutCapabilities!: PractitionerPayoutCapabilityResponseDto[];
}

export class PractitionerProfileReadinessSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerProfileReadinessResponseDto })
  readiness!: PractitionerProfileReadinessResponseDto;
}
