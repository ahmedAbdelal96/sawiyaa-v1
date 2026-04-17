import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Admin create DTO for primary specialty categories.
 * Slug is generated safely on backend from title to reduce admin input burden.
 */
export class CreateSpecialtyCategoryDto {
  @ApiProperty({
    description: 'Primary specialty category title',
  })
  @IsString()
  @MaxLength(191)
  title!: string;

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
    description: 'Initial activation state. Defaults to active.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

