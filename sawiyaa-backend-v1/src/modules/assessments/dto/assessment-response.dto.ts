import { ApiProperty } from '@nestjs/swagger';
import {
  AssessmentDefinitionStatus,
  AssessmentQuestionInputType,
  AssessmentResultBand,
  AssessmentSubmissionStatus,
} from '@prisma/client';

export class AssessmentOptionDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;
}

export class AssessmentQuestionDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  prompt!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: AssessmentQuestionInputType })
  inputType!: AssessmentQuestionInputType;

  @ApiProperty()
  isRequired!: boolean;

  @ApiProperty({ isArray: true, type: AssessmentOptionDto })
  options!: AssessmentOptionDto[];
}

export class AssessmentDefinitionDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  category!: string;

  @ApiProperty({ nullable: true })
  introText!: string | null;

  @ApiProperty({ nullable: true })
  outroText!: string | null;

  @ApiProperty({ nullable: true })
  estimatedDurationMinutes!: number | null;

  @ApiProperty({ enum: AssessmentDefinitionStatus })
  status!: AssessmentDefinitionStatus;
}

export class AssessmentDefinitionDetailsDto extends AssessmentDefinitionDto {
  @ApiProperty({ isArray: true, type: AssessmentQuestionDto })
  questions!: AssessmentQuestionDto[];
}

export class AssessmentListDataDto {
  @ApiProperty({ isArray: true, type: AssessmentDefinitionDto })
  items!: AssessmentDefinitionDto[];
}

export class AssessmentListSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AssessmentListDataDto })
  data!: AssessmentListDataDto;
}

export class AssessmentDefinitionDataDto {
  @ApiProperty({ type: AssessmentDefinitionDetailsDto })
  item!: AssessmentDefinitionDetailsDto;
}

export class AssessmentDefinitionSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AssessmentDefinitionDataDto })
  data!: AssessmentDefinitionDataDto;
}

export class AssessmentResultDto {
  @ApiProperty()
  score!: number;

  @ApiProperty({ enum: AssessmentResultBand })
  band!: AssessmentResultBand;

  @ApiProperty()
  summary!: string;

  @ApiProperty({ isArray: true, type: String })
  nextSteps!: string[];
}

export class AssessmentSummaryDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;
}

export class AssessmentSubmissionResultDataDto {
  @ApiProperty()
  submissionId!: string;

  @ApiProperty({ type: AssessmentSummaryDto })
  assessment!: AssessmentSummaryDto;

  @ApiProperty({ type: AssessmentResultDto })
  result!: AssessmentResultDto;
}

export class AssessmentSubmissionResultSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: AssessmentSubmissionResultDataDto })
  data!: AssessmentSubmissionResultDataDto;
}

export class PatientAssessmentHistoryItemDto {
  @ApiProperty()
  submissionId!: string;

  @ApiProperty()
  assessmentSlug!: string;

  @ApiProperty()
  assessmentTitle!: string;

  @ApiProperty({ enum: AssessmentSubmissionStatus })
  status!: AssessmentSubmissionStatus;

  @ApiProperty({ nullable: true })
  totalScore!: number | null;

  @ApiProperty({ enum: AssessmentResultBand, nullable: true })
  resultBand!: AssessmentResultBand | null;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class PatientAssessmentsPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PatientAssessmentsHistoryDataDto {
  @ApiProperty({ type: PatientAssessmentHistoryItemDto, isArray: true })
  items!: PatientAssessmentHistoryItemDto[];

  @ApiProperty({ type: PatientAssessmentsPaginationDto })
  pagination!: PatientAssessmentsPaginationDto;
}

export class PatientAssessmentsHistorySuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientAssessmentsHistoryDataDto })
  data!: PatientAssessmentsHistoryDataDto;
}

export class PatientAssessmentSubmissionDetailsDataDto {
  @ApiProperty()
  submissionId!: string;

  @ApiProperty({ type: AssessmentSummaryDto })
  assessment!: AssessmentSummaryDto;

  @ApiProperty({ enum: AssessmentSubmissionStatus })
  status!: AssessmentSubmissionStatus;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty({ type: AssessmentResultDto, nullable: true })
  result!: AssessmentResultDto | null;
}

export class PatientAssessmentSubmissionDetailsSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: PatientAssessmentSubmissionDetailsDataDto })
  data!: PatientAssessmentSubmissionDetailsDataDto;
}
