import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { SessionStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SessionPresentationFilter } from '../types/session-video.types';

export class ListSessionsDto {
  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({
    enum: SessionPresentationFilter,
    description:
      'Optional presentation-safe session filter for scalable user-facing session lists.',
  })
  @IsOptional()
  @IsEnum(SessionPresentationFilter)
  presentationFilter?: SessionPresentationFilter;

  @ApiPropertyOptional({
    description:
      'Optional human-readable session reference search (for example: SES-2026-000123).',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsString()
  @MaxLength(32)
  query?: string;

  @ApiPropertyOptional({
    description:
      'Filter sessions scheduled at or after this datetime (ISO string).',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsDateString()
  scheduledFrom?: string;

  @ApiPropertyOptional({
    description:
      'Filter sessions scheduled at or before this datetime (ISO string).',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsDateString()
  scheduledTo?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
