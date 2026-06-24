import { ApiProperty } from '@nestjs/swagger';
import { PractitionerApplicationStatus } from '@prisma/client';
import { PractitionerApplicationCompletionResponseDto } from './practitioner-application-completion-response.dto';

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
}

export class PractitionerApplicationStatusSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerApplicationStatusResponseDto })
  application!: PractitionerApplicationStatusResponseDto;
}
