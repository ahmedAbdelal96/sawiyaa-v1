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
 * Name updates are optional; when provided backend regenerates slug safely.
 */
export class UpdateSpecialtyCategoryDto {
  @ApiPropertyOptional({
    description: 'Arabic primary specialty category name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  nameAr?: string;

  @ApiPropertyOptional({
    description: 'English primary specialty category name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  nameEn?: string;

  @ApiPropertyOptional({
    description:
      'Legacy compatibility field. When provided it is ignored in favor of nameEn/nameAr.',
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
