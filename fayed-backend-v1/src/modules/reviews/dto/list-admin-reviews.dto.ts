import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionReviewStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class ListAdminReviewsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @ApiPropertyOptional({ enum: SessionReviewStatus })
  @IsOptional()
  @IsEnum(SessionReviewStatus)
  status?: SessionReviewStatus;

  @ApiPropertyOptional({
    description: 'Filter by practitioner profile id',
  })
  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by session id',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Return reviews that still need moderation attention',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === true || value === 'true') {
      return true;
    }
    if (value === false || value === 'false') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  needsModeration?: boolean;
}
