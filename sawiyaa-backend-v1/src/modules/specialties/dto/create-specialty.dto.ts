import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { Type } from 'class-transformer';

/**
 * Admin create DTO for practitioner specialties only.
 * This module does not manage article/course categories.
 */
export class CreateSpecialtyDto {
  @ApiProperty({
    description: 'Primary specialty category id',
    format: 'uuid',
  })
  @IsUUID('4')
  categoryId!: string;

  @ApiProperty({
    description:
      'Canonical specialty slug used by public read endpoints. Must be unique system-wide. Server normalizes it to lowercase kebab-case before persistence.',
  })
  @IsString()
  @MaxLength(191)
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiProperty({
    description: 'Arabic specialty name',
  })
  @IsString()
  @MaxLength(191)
  nameAr!: string;

  @ApiProperty({
    description: 'English specialty name',
  })
  @IsString()
  @MaxLength(191)
  nameEn!: string;

  @ApiPropertyOptional({
    description:
      'Legacy compatibility field. When provided it is ignored in favor of nameEn/nameAr.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  title?: string;

  @ApiPropertyOptional({
    description: 'Optional localized specialty description',
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
    description: 'Initial activation state. Defaults to active.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
