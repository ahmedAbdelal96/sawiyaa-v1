import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRoleType, UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Query DTO for listing internal (admin/staff) platform users.
 */
export class ListAdminUsersDto {
  @ApiPropertyOptional({
    description: 'Optional search query (display name / email / phone)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    enum: UserRoleType,
    description: 'Optional role filter (internal roles only are supported)',
  })
  @IsOptional()
  @IsEnum(UserRoleType)
  role?: UserRoleType;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'Optional status filter',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
