import { ApiProperty } from '@nestjs/swagger';
import { PractitionerApplicationStatus } from '@prisma/client';

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

  @ApiProperty()
  isProfileCompleted!: boolean;

  @ApiProperty()
  canSubmitApplication!: boolean;

  @ApiProperty({ type: [String] })
  missingRequirements!: string[];
}

export class PractitionerApplicationStatusSuccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: PractitionerApplicationStatusResponseDto })
  application!: PractitionerApplicationStatusResponseDto;
}
