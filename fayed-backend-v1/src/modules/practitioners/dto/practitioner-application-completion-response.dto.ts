import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PractitionerApplicationCompletionIssueResponseDto {
  @ApiProperty()
  code!: string;

  @ApiPropertyOptional({ nullable: true })
  field?: string;

  @ApiProperty()
  stepKey!: string;

  @ApiProperty({ enum: ['BLOCKER', 'WARNING', 'INFO'] })
  severity!: 'BLOCKER' | 'WARNING' | 'INFO';

  @ApiProperty({ enum: ['SUBMISSION', 'APPROVAL', 'OPTIONAL'] })
  requirementScope!: 'SUBMISSION' | 'APPROVAL' | 'OPTIONAL';

  @ApiProperty()
  messageKey!: string;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata?: Record<string, unknown>;
}

export class PractitionerApplicationCompletionStepResponseDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  titleKey!: string;

  @ApiProperty({ enum: ['complete', 'incomplete', 'warning'] })
  status!: 'complete' | 'incomplete' | 'warning';

  @ApiProperty()
  percent!: number;

  @ApiProperty()
  requiredCount!: number;

  @ApiProperty()
  completedRequiredCount!: number;

  @ApiProperty({
    type: PractitionerApplicationCompletionIssueResponseDto,
    isArray: true,
  })
  issues!: PractitionerApplicationCompletionIssueResponseDto[];
}

export class PractitionerApplicationCompletionResponseDto {
  @ApiProperty()
  overallPercent!: number;

  @ApiProperty()
  canSubmit!: boolean;

  @ApiProperty({
    type: PractitionerApplicationCompletionIssueResponseDto,
    isArray: true,
  })
  blockers!: PractitionerApplicationCompletionIssueResponseDto[];

  @ApiProperty({
    type: PractitionerApplicationCompletionIssueResponseDto,
    isArray: true,
  })
  warnings!: PractitionerApplicationCompletionIssueResponseDto[];

  @ApiProperty({
    type: PractitionerApplicationCompletionStepResponseDto,
    isArray: true,
  })
  steps!: PractitionerApplicationCompletionStepResponseDto[];
}
