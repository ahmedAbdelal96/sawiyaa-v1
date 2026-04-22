import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Admin update DTO for primary specialty categories.
 * Title update is optional; when provided backend regenerates slug safely.
 */
export class UpdateSpecialtyCategoryDto {
  @ApiPropertyOptional({
    description: 'Primary specialty category title',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  title?: string;

  @ApiPropertyOptional({
    description: 'Optional primary category description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Activation state update',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
