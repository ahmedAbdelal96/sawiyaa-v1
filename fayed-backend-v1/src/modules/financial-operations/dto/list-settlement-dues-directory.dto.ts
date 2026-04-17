import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum SettlementDuesFinanceFilterDto {
  ALL = 'all',
  WITH_DUE = 'with_due',
  WITH_BALANCE = 'with_balance',
  EMPTY = 'empty',
}

export enum SettlementDuesVerificationFilterDto {
  ALL = 'all',
  VERIFIED = 'verified',
  UNVERIFIED = 'unverified',
}

export enum SettlementDuesSortByDto {
  DUE_DESC = 'due_desc',
  BALANCE_DESC = 'balance_desc',
  NAME_ASC = 'name_asc',
}

export class ListSettlementDuesDirectoryDto {
  @ApiPropertyOptional({ description: 'Search by practitioner slug or display name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Currency code filter (3-letter ISO)', example: 'EGP' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({ enum: SettlementDuesFinanceFilterDto, default: SettlementDuesFinanceFilterDto.ALL })
  @IsOptional()
  @IsEnum(SettlementDuesFinanceFilterDto)
  finance?: SettlementDuesFinanceFilterDto;

  @ApiPropertyOptional({ enum: SettlementDuesVerificationFilterDto, default: SettlementDuesVerificationFilterDto.ALL })
  @IsOptional()
  @IsEnum(SettlementDuesVerificationFilterDto)
  verification?: SettlementDuesVerificationFilterDto;

  @ApiPropertyOptional({ enum: SettlementDuesSortByDto, default: SettlementDuesSortByDto.DUE_DESC })
  @IsOptional()
  @IsEnum(SettlementDuesSortByDto)
  sortBy?: SettlementDuesSortByDto;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

