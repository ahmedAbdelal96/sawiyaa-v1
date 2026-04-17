import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PatchCurrentUserProfileDto {
  @ApiPropertyOptional({
    description: 'Display name shown across the product',
    maxLength: 80,
    example: 'Admin User',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  displayName?: string;
}

