import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PatchAdminUserDto {
  @ApiPropertyOptional({ maxLength: 191 })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  displayName?: string;

  @ApiPropertyOptional({ maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultLocale?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}
