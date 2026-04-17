import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Public read filters stay intentionally minimal in Phase 1.
 * Advanced discovery ranking/filtering belongs to later search/discovery layers.
 */
export class ListSpecialtiesDto {
  @ApiPropertyOptional({
    description: 'Optional lightweight search by localized title',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

