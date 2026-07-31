import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PractitionerSettlementStatus, SettlementAdjustmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, Matches } from 'class-validator';

export enum AdminSettlementSortBy {
  CREATED_AT = 'createdAt',
  AMOUNT = 'amount',
  PRACTITIONER_NAME = 'practitionerName',
}

export enum AdminSettlementSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListAdminSettlementsDto {
  @ApiPropertyOptional({ description: 'Search settlement reference, practitioner, patient, or session code' })
  @IsOptional() @IsString() @MaxLength(120)
  query?: string;

  @ApiPropertyOptional({ enum: PractitionerSettlementStatus })
  @IsOptional() @IsEnum(PractitionerSettlementStatus)
  status?: PractitionerSettlementStatus;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  practitionerId?: string;

  @ApiPropertyOptional({ example: 'EGP' })
  @IsOptional() @IsString() @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ example: 'EG' })
  @IsOptional() @IsString() @MaxLength(3)
  country?: string;

  @ApiPropertyOptional({ enum: AdminSettlementSortBy, default: AdminSettlementSortBy.CREATED_AT })
  @IsOptional() @IsEnum(AdminSettlementSortBy)
  sortBy?: AdminSettlementSortBy = AdminSettlementSortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: AdminSettlementSortDirection, default: AdminSettlementSortDirection.DESC })
  @IsOptional() @IsEnum(AdminSettlementSortDirection)
  sortDirection?: AdminSettlementSortDirection = AdminSettlementSortDirection.DESC;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}

export class AddSettlementAdjustmentDto {
  @ApiProperty({ enum: SettlementAdjustmentType }) @IsEnum(SettlementAdjustmentType)
  type!: SettlementAdjustmentType;

  @ApiProperty({ example: '50.00' }) @IsString() @MaxLength(32)
  amount!: string;

  @ApiProperty({ example: 'Administrative processing fee' }) @IsString() @MaxLength(1000)
  reason!: string;
}

export class RejectSettlementDto {
  @ApiProperty({ example: 'Session did not meet payout eligibility criteria' })
  @IsString() @MaxLength(1000)
  reason!: string;
}

export class ApproveSettlementDto {
  @ApiPropertyOptional({ example: '50.00000000', description: 'Required when payment currency differs from wallet currency.' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/)
  exchangeRate?: string;

  @ApiPropertyOptional({ example: '3500.00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  approvedWalletCreditAmount?: string;

  @ApiPropertyOptional({ example: 'Approved rounding correction' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  walletCreditOverrideReason?: string;
}
