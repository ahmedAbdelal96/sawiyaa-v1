import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export enum AdminPractitionerWalletSortBy {
  LATEST_ACTIVITY = 'latestActivity',
  BALANCE = 'balance',
  NAME = 'name',
}

export class ListAdminPractitionerWalletsDto {
  @ApiPropertyOptional({ description: 'Practitioner name, email, or readable code' })
  @IsOptional() @IsString() @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ example: 'EGP' })
  @IsOptional() @IsString() @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional({ enum: AdminPractitionerWalletSortBy, default: AdminPractitionerWalletSortBy.LATEST_ACTIVITY })
  @IsOptional() @IsEnum(AdminPractitionerWalletSortBy)
  sortBy?: AdminPractitionerWalletSortBy = AdminPractitionerWalletSortBy.LATEST_ACTIVITY;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional() @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}

export class GetAdminPractitionerWalletDto {
  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 20;
}
