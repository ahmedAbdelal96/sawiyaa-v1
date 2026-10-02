import { ConfigScopeType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  Allow,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListAdminPlatformSettingsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(['editable', 'readonly', 'changed', 'default'] as const)
  state?: 'editable' | 'readonly' | 'changed' | 'default';
}

export class UpdateAdminPlatformSettingDto {
  @Allow()
  value!: unknown;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string | null;

  @IsOptional()
  @IsEnum(ConfigScopeType)
  scopeType?: ConfigScopeType;

  @IsOptional()
  @IsString()
  scopeRefId?: string | null;
}

export class ResetAdminPlatformSettingDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string | null;

  @IsOptional()
  @IsEnum(ConfigScopeType)
  scopeType?: ConfigScopeType;

  @IsOptional()
  @IsString()
  scopeRefId?: string | null;
}

export class AdminPlatformSettingHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}
