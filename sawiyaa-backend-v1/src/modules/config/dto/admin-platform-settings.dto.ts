import { ConfigScopeType } from '@prisma/client';
import { IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import {
  Allow,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsBoolean,
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

  @IsOptional()
  @IsString()
  @IsIn([
    'sessions',
    'notifications',
    'messaging',
    'practitioners',
    'patientsAccounts',
    'contentAcademy',
    'general',
    'paymentsFinance',
    'advanced',
  ])
  domain?:
    | 'sessions'
    | 'notifications'
    | 'messaging'
    | 'practitioners'
    | 'patientsAccounts'
    | 'contentAcademy'
    | 'general'
    | 'paymentsFinance'
    | 'advanced';
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

export class AdminPlatformSettingChangeDto {
  @IsString()
  key!: string;

  @Allow()
  value?: unknown;

  @IsOptional()
  @IsBoolean()
  reset?: boolean;

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

export class AdminPlatformSettingChangeSetDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdminPlatformSettingChangeDto)
  changes!: AdminPlatformSettingChangeDto[];

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'sessions',
    'notifications',
    'messaging',
    'practitioners',
    'patientsAccounts',
    'contentAcademy',
    'general',
    'paymentsFinance',
    'advanced',
  ])
  domain?: string;
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
