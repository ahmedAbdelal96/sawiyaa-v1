import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AssessmentQuestionInputType,
  AssessmentResultBand,
  AssessmentSubmissionStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SubmitAssessmentAnswerDto } from '@modules/assessments/dto/submit-assessment.dto';

export class ListAdminAssessmentsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE'])
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  slug?: string;
}

export class UpsertAssessmentBandThresholdDto {
  @ApiProperty({ enum: AssessmentResultBand })
  @IsEnum(AssessmentResultBand)
  band!: AssessmentResultBand;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minInclusive!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxInclusive!: number;
}

export class UpsertAssessmentScoringConfigDto {
  @ApiProperty({ type: UpsertAssessmentBandThresholdDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertAssessmentBandThresholdDto)
  thresholds!: UpsertAssessmentBandThresholdDto[];
}

export class CreateAdminAssessmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(191)
  slug!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  introText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  outroText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ type: UpsertAssessmentScoringConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertAssessmentScoringConfigDto)
  scoringConfig?: UpsertAssessmentScoringConfigDto;
}

export class UpdateAdminAssessmentMetadataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(191)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  introText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  outroText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  estimatedDurationMinutes?: number | null;
}

export class CreateAdminAssessmentQuestionDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9_:-]+$/i)
  @MaxLength(100)
  key!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  prompt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    enum: AssessmentQuestionInputType,
    default: AssessmentQuestionInputType.SINGLE_CHOICE,
  })
  @IsOptional()
  @IsEnum(AssessmentQuestionInputType)
  inputType?: AssessmentQuestionInputType;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order?: number;
}

export class UpdateAdminAssessmentQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_:-]+$/i)
  @MaxLength(100)
  key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  prompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ enum: AssessmentQuestionInputType })
  @IsOptional()
  @IsEnum(AssessmentQuestionInputType)
  inputType?: AssessmentQuestionInputType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRequired?: boolean;
}

export class ReorderAdminAssessmentQuestionsDto {
  @ApiProperty({ type: String, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  questionIds!: string[];
}

export class CreateAdminAssessmentOptionDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9_:-]+$/i)
  @MaxLength(100)
  key!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  label!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  scoreValue!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order?: number;
}

export class UpdateAdminAssessmentOptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_:-]+$/i)
  @MaxLength(100)
  key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  scoreValue?: number;
}

export class ReorderAdminAssessmentOptionsDto {
  @ApiProperty({ type: String, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  optionIds!: string[];
}

export class PreviewAdminAssessmentScoreDto {
  @ApiProperty({
    type: SubmitAssessmentAnswerDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAssessmentAnswerDto)
  answers!: SubmitAssessmentAnswerDto[];
}

export class PreviewAdminAssessmentScoreResponseDto {
  @ApiProperty()
  score!: number;

  @ApiProperty()
  maxScore!: number;

  @ApiProperty({ enum: AssessmentResultBand })
  band!: AssessmentResultBand;

  @ApiProperty()
  summaryPreview!: string;

  @ApiProperty({ type: String, isArray: true })
  nextStepsPreview!: string[];
}

export class AdminAssessmentLifecycleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'INACTIVE'] })
  status!: 'DRAFT' | 'ACTIVE' | 'INACTIVE';

  @ApiProperty()
  isPublished!: boolean;
}

export class ListAdminAssessmentSubmissionsDto {
  @ApiPropertyOptional({ enum: AssessmentSubmissionStatus })
  @IsOptional()
  @IsEnum(AssessmentSubmissionStatus)
  status?: AssessmentSubmissionStatus;
}
