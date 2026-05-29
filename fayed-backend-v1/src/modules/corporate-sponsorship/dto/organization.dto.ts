import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CorporateOrganizationStatus } from '@prisma/client';

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Organization name', example: 'ACME Corp' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Unique company code', example: 'ACME' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  companyCode: string;

  @ApiPropertyOptional({ description: 'ISO country code', example: 'EGY' })
  @IsOptional()
  @IsString()
  countryIsoCode?: string;

  @ApiProperty({ description: 'Billing contact email', example: 'billing@acme.com' })
  @IsEmail()
  billingEmail: string;

  @ApiPropertyOptional({ description: 'Contact person name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact phone number', example: '+201234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({
    enum: CorporateOrganizationStatus,
    default: CorporateOrganizationStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CorporateOrganizationStatus)
  status?: CorporateOrganizationStatus;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Organization name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Company code (read-only if has contracts/batches)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  companyCode?: string;

  @ApiPropertyOptional({ description: 'ISO country code' })
  @IsOptional()
  @IsString()
  countryIsoCode?: string;

  @ApiPropertyOptional({ description: 'Billing contact email' })
  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @ApiPropertyOptional({ description: 'Contact person name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;
}

export class UpdateOrganizationStatusDto {
  @ApiProperty({ enum: CorporateOrganizationStatus, description: 'New status' })
  @IsEnum(CorporateOrganizationStatus)
  status: CorporateOrganizationStatus;
}

export class ListOrganizationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search by name or company code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CorporateOrganizationStatus })
  @IsOptional()
  @IsEnum(CorporateOrganizationStatus)
  status?: CorporateOrganizationStatus;

  @ApiPropertyOptional({ default: 'createdAt', description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ default: 'desc', description: 'Sort direction' })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc' = 'desc';
}

export class OrganizationResponseDto {
  id: string;
  name: string;
  companyCode: string;
  countryIsoCode: string | null;
  status: CorporateOrganizationStatus;
  billingEmail: string;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
  contractCount?: number;
  activeContractCount?: number;
}

export class OrganizationListResponseDto {
  success: true;
  data: {
    items: OrganizationResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class OrganizationItemResponseDto {
  success: true;
  data: OrganizationResponseDto;
}