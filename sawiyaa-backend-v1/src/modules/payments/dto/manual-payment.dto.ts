import {
  IsArray,
  IsEnum,
  IsInt,
  Matches,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ManualPaymentAvailabilityMode,
  ManualPaymentMethodType,
  ManualPaymentSubmissionStatus,
} from '@prisma/client';

export class UpsertManualPaymentMethodDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  code!: string;

  @IsEnum(ManualPaymentMethodType)
  type!: ManualPaymentMethodType;

  @IsString()
  @MinLength(1)
  @MaxLength(191)
  displayNameAr!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(191)
  displayNameEn!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(191)
  accountHolderName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(191)
  accountIdentifier!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructionsAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructionsEn?: string;

  @IsEnum(ManualPaymentAvailabilityMode)
  availabilityMode!: ManualPaymentAvailabilityMode;

  @IsOptional()
  @IsArray()
  @Matches(/^[A-Za-z]{2}$/, { each: true })
  countryIsoCodes?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @IsOptional()
  isEnabled?: boolean;
}

export class SubmitManualPaymentDto {
  @IsString()
  methodId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(191)
  senderAccountName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  token?: string;
}

export class RejectManualPaymentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}

export class ListManualPaymentSubmissionsDto {
  @IsOptional()
  @IsEnum(ManualPaymentSubmissionStatus)
  status?: ManualPaymentSubmissionStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}
