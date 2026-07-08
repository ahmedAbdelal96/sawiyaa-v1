import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Admin update DTO keeps specialty edits focused on baseline catalog concerns.
 */
export class UpdateSpecialtyDto {
  @ApiPropertyOptional({
    description: 'Primary specialty category id',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Canonical specialty slug. Optional on update; if provided, uniqueness is re-validated and conflicting slugs are rejected.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Arabic specialty name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  nameAr?: string;

  @ApiPropertyOptional({
    description: 'English specialty name',
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
    description: 'Localized description for current locale',
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
