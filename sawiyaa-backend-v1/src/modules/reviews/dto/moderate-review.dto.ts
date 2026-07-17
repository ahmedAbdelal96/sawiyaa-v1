import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionReviewModerationDecision } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  Min,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class ModerateReviewDto {
  @ApiProperty({ enum: SessionReviewModerationDecision })
  @IsEnum(SessionReviewModerationDecision)
  decision!: SessionReviewModerationDecision;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 5,
    nullable: true,
    description:
      'Optional public/display rating when the moderator edits and approves the review',
  })
  @ValidateIf(
    (input: ModerateReviewDto) =>
      input.decision ===
      SessionReviewModerationDecision.EDITED_AND_APPROVED,
  )
  @IsInt()
  @Min(1)
  @Max(5)
  publicRatingValue?: number;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 1000,
    description: 'Optional moderator reason stored for audit visibility',
  })
  @ValidateIf(
    (input: ModerateReviewDto) =>
      input.decision !== SessionReviewModerationDecision.APPROVED_AS_IS,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  moderationReason?: string;
}
