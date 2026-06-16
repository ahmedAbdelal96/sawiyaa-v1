import { ApiPropertyOptional } from '@nestjs/swagger';
import { PractitionerGender, PractitionerType } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PractitionerPayoutDestinationInputDto } from './practitioner-payout-destination.dto';
import { PractitionerSpecialtySelectionInputDto } from './practitioner-specialty-selection.dto';

export class SubmitPractitionerApplicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  professionalTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string | null;

  @ApiPropertyOptional({
    description: 'Active country ISO code for practitioner profile linkage',
  })
  @IsOptional()
  @IsString()
  @Length(2, 3)
  @Matches(/^[A-Za-z]{2,3}$/)
  countryCode?: string | null;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  yearsOfExperience?: number | null;

  @ApiPropertyOptional({ enum: PractitionerType })
  @IsOptional()
  @IsEnum(PractitionerType)
  practitionerType?: PractitionerType;

  @ApiPropertyOptional({ enum: PractitionerGender })
  @IsOptional()
  @IsEnum(PractitionerGender)
  practitionerGender?: PractitionerGender | null;

  @ApiPropertyOptional({
    example: 250,
    description: '30-minute session price in EGP',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  sessionPrice30Egp?: number | null;

  @ApiPropertyOptional({
    example: 8,
    description: '30-minute session price in USD',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  sessionPrice30Usd?: number | null;

  @ApiPropertyOptional({
    example: 450,
    description: '60-minute session price in EGP',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  sessionPrice60Egp?: number | null;

  @ApiPropertyOptional({
    example: 15,
    description: '60-minute session price in USD',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  sessionPrice60Usd?: number | null;

  @ApiPropertyOptional({
    example: 300,
    description: '30-minute instant booking price in EGP',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  instantBookingPrice30Egp?: number | null;

  @ApiPropertyOptional({
    example: 10,
    description: '30-minute instant booking price in USD',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  instantBookingPrice30Usd?: number | null;

  @ApiPropertyOptional({
    example: 520,
    description: '60-minute instant booking price in EGP',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  instantBookingPrice60Egp?: number | null;

  @ApiPropertyOptional({
    example: 18,
    description: '60-minute instant booking price in USD',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  instantBookingPrice60Usd?: number | null;

  @ApiPropertyOptional({ enum: ['ar', 'en'] })
  @IsOptional()
  @IsString()
  @Matches(/^(ar|en)$/)
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Lowercase language codes linked to the practitioner profile, such as ar/en.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(10, { each: true })
  languageCodes?: string[];

  @ApiPropertyOptional({
    type: PractitionerSpecialtySelectionInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PractitionerSpecialtySelectionInputDto)
  specialtySelection?: PractitionerSpecialtySelectionInputDto;

  @ApiPropertyOptional({
    type: PractitionerPayoutDestinationInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PractitionerPayoutDestinationInputDto)
  payoutDestination?: PractitionerPayoutDestinationInputDto | null;

  @ApiPropertyOptional({
    description:
      'Optional practitioner avatar image reference or data URL submitted as part of the review snapshot.',
    maxLength: 2000000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000000)
  avatarUrl?: string | null;
}
