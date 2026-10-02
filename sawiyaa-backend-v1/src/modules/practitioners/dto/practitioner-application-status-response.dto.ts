import { ApiProperty } from '@nestjs/swagger';
import { CredentialType, PractitionerApplicationStatus, ReviewCaseStatus, ReviewRequirementSeverity, ReviewRequirementStatus, ReviewSection } from '@prisma/client';
import { PractitionerApplicationCompletionResponseDto } from './practitioner-application-completion-response.dto';

class PractitionerApplicationRequirementResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty({ enum: ReviewSection })
  section!: ReviewSection;
  @ApiProperty({ nullable: true })
  fieldPath!: string | null;
  @ApiProperty({ enum: CredentialType, nullable: true })
  credentialType!: CredentialType | null;
  @ApiProperty({ enum: ReviewRequirementStatus })
  status!: ReviewRequirementStatus;
  @ApiProperty()
  title!: string;
  @ApiProperty()
  reason!: string;
  @ApiProperty({ nullable: true })
  instructions!: string | null;
  @ApiProperty({ nullable: true })
  dueAt!: Date | null;
  @ApiProperty({ nullable: true })
  requestedAt!: Date | null;
  @ApiProperty({ enum: ReviewRequirementSeverity })
  severity!: ReviewRequirementSeverity;
  @ApiProperty({ type: [String] })
  operationalImpact!: string[];
}

class PractitionerApplicationReviewCaseResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty({ enum: ['ONBOARDING', 'PRACTITIONER_CHANGE'] })
  caseType!: string;
  @ApiProperty({ nullable: true })
  submittedAt!: Date | null;
  @ApiProperty({ nullable: true })
  dueAt!: Date | null;
  @ApiProperty({ enum: ReviewCaseStatus })
  status!: ReviewCaseStatus;
  @ApiProperty({ type: [PractitionerApplicationRequirementResponseDto] })
  requirements!: PractitionerApplicationRequirementResponseDto[];
}

export class PractitionerApplicationStatusResponseDto {
  @ApiProperty({ nullable: true })
  applicationId!: string | null;

  @ApiProperty({ enum: PractitionerApplicationStatus, nullable: true })
  status!: PractitionerApplicationStatus | null;

  @ApiProperty({ nullable: true })
  submittedAt!: Date | null;

  @ApiProperty({ nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ nullable: true })
  reviewedByUserId!: string | null;

  @ApiProperty({ nullable: true })
  reviewDecisionReason!: string | null;

  @ApiProperty({ nullable: true })
  reviewNotes!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  submissionSnapshot!: Record<string, unknown> | null;

  @ApiProperty()
  isProfileCompleted!: boolean;

  @ApiProperty()
  canSubmitApplication!: boolean;

  @ApiProperty({ type: [String] })
  missingRequirements!: string[];

  @ApiProperty({ type: PractitionerApplicationCompletionResponseDto })
  completion!: PractitionerApplicationCompletionResponseDto;

  @ApiProperty({ type: PractitionerApplicationReviewCaseResponseDto, nullable: true })
  reviewCase!: PractitionerApplicationReviewCaseResponseDto | null;
}

export class PractitionerApplicationStatusSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerApplicationStatusResponseDto })
  application!: PractitionerApplicationStatusResponseDto;
}
