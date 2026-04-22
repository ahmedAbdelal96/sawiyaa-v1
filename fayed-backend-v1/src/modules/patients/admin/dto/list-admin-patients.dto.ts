import { ApiPropertyOptional } from '@nestjs/swagger';
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

export enum AdminPatientStatusDto {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

export enum AdminPatientOnboardingDto {
  ALL = 'all',
  COMPLETED = 'completed',
  INCOMPLETE = 'incomplete',
}

/**
 * Admin patients directory query contract.
 * This intentionally exposes operational filters only, not sensitive auth fields.
 */
export class ListAdminPatientsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: AdminPatientStatusDto })
  @IsOptional()
  @IsEnum(AdminPatientStatusDto)
  status?: AdminPatientStatusDto;

  @ApiPropertyOptional({
    enum: AdminPatientOnboardingDto,
    default: AdminPatientOnboardingDto.ALL,
  })
  @IsOptional()
  @IsEnum(AdminPatientOnboardingDto)
  onboarding?: AdminPatientOnboardingDto;

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
