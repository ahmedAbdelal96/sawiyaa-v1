import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewModerationAction } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateReviewDto {
  @ApiProperty({ enum: ReviewModerationAction })
  @IsEnum(ReviewModerationAction)
  action!: ReviewModerationAction;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 1000,
    description: 'Optional moderator note stored for audit visibility',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  moderatorNote?: string;
}
