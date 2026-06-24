import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { REVIEW_MAX_RATING, REVIEW_MIN_RATING } from '../types/reviews.types';

export class CreateSessionReviewDto {
  @ApiProperty({
    minimum: REVIEW_MIN_RATING,
    maximum: REVIEW_MAX_RATING,
    description: 'Overall session rating from 1 to 5',
  })
  @Type(() => Number)
  @IsInt()
  @Min(REVIEW_MIN_RATING)
  @Max(REVIEW_MAX_RATING)
  overallRating!: number;

  @ApiProperty({
    required: false,
    maxLength: 191,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  title?: string;

  @ApiProperty({
    required: false,
    maxLength: 4000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  textReview?: string;
}
